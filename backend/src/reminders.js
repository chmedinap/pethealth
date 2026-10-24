const db = require('./db')
const { ACCESSIBLE_PETS_SQL } = require('./access')

// Nivel de acceso del usuario a la mascota `p` (para saber si puede registrar dosis)
const ACCESS_SQL = `CASE WHEN p.user_id = @userId THEN 'owner'
  ELSE (SELECT role FROM pet_shares WHERE pet_id = p.id AND user_id = @userId) END`

// Pendientes de todas las mascotas que el usuario puede ver, hasta `days` días
// después de `today`. Lo usan el panel del dashboard, el correo diario y el calendario.
//   due         — visitas, refuerzos de vacuna y antiparasitarios (vencidos o próximos)
//   medications — tratamientos en curso, con las dosis registradas en `today`
function listReminders(userId, today, days) {
  const params = { userId, today, days }

  // Próxima visita: solo cuenta la de la consulta más reciente de cada mascota
  // (una consulta posterior "cumple" la próxima visita que indicaba la anterior).
  const visits = db.prepare(`
    WITH latest AS (
      SELECT c.*, ROW_NUMBER() OVER (PARTITION BY c.pet_id ORDER BY c.checkup_date DESC, c.id DESC) AS rn
      FROM checkups c
      WHERE c.pet_id IN (${ACCESSIBLE_PETS_SQL})
    )
    SELECT 'visit' AS type, l.id AS ref_id, l.pet_id, p.name AS pet_name, p.species,
           l.next_visit_date AS date, l.reason AS title, l.clinic_name AS detail
    FROM latest l JOIN pets p ON p.id = l.pet_id
    WHERE l.rn = 1 AND l.next_visit_date IS NOT NULL
      AND l.next_visit_date <= date(@today, '+' || @days || ' days')
  `).all(params)

  // Vacunas: la dosis más reciente de cada vacuna (por nombre) define el próximo refuerzo
  const vaccines = db.prepare(`
    WITH latest AS (
      SELECT v.*, ROW_NUMBER() OVER (PARTITION BY v.pet_id, lower(trim(v.name)) ORDER BY v.date_given DESC, v.id DESC) AS rn
      FROM vaccines v
      WHERE v.pet_id IN (${ACCESSIBLE_PETS_SQL})
    )
    SELECT 'vaccine' AS type, l.id AS ref_id, l.pet_id, p.name AS pet_name, p.species,
           l.next_due_date AS date, l.name AS title, NULL AS detail
    FROM latest l JOIN pets p ON p.id = l.pet_id
    WHERE l.rn = 1 AND l.next_due_date IS NOT NULL
      AND l.next_due_date <= date(@today, '+' || @days || ' days')
  `).all(params)

  // Antiparasitarios: el tratamiento más reciente de cada tipo (interno/externo/combinado).
  // Cambiar de producto no deja recordatorios viejos colgando.
  const parasites = db.prepare(`
    WITH latest AS (
      SELECT t.*, ROW_NUMBER() OVER (PARTITION BY t.pet_id, t.kind ORDER BY t.date_given DESC, t.id DESC) AS rn
      FROM parasite_treatments t
      WHERE t.pet_id IN (${ACCESSIBLE_PETS_SQL})
    )
    SELECT 'parasite' AS type, l.id AS ref_id, l.pet_id, p.name AS pet_name, p.species,
           l.next_due_date AS date, l.product AS title, l.kind AS detail
    FROM latest l JOIN pets p ON p.id = l.pet_id
    WHERE l.rn = 1 AND l.next_due_date IS NOT NULL
      AND l.next_due_date <= date(@today, '+' || @days || ' days')
  `).all(params)

  // Tratamientos en curso: recetados con duración y cuyo último día es hoy o después
  const medications = db.prepare(`
    SELECT 'medication' AS type, m.id AS ref_id, c.pet_id, p.name AS pet_name, p.species,
           date(c.checkup_date, '+' || (m.duration_days - 1) || ' days') AS date,
           m.name AS title, m.frequency, m.concentration, c.checkup_date AS started_on,
           ${ACCESS_SQL} AS access
    FROM medications m
    JOIN checkups c ON c.id = m.checkup_id
    JOIN pets p ON p.id = c.pet_id
    WHERE c.pet_id IN (${ACCESSIBLE_PETS_SQL})
      AND m.duration_days > 0
      AND c.checkup_date <= @today
      AND date(c.checkup_date, '+' || (m.duration_days - 1) || ' days') >= @today
    ORDER BY date ASC
  `).all(params)

  const doses = dosesOn(medications.map(m => m.ref_id), today)

  const withStatus = item => ({ ...item, status: item.date < today ? 'overdue' : 'upcoming' })
  const due = [...visits, ...vaccines, ...parasites].map(withStatus)
    .sort((a, b) => a.date.localeCompare(b.date) || a.pet_name.localeCompare(b.pet_name))

  return {
    today,
    days,
    due,
    medications: medications.map(m => ({ ...m, status: 'active', doses_today: doses[m.ref_id] || [] })),
  }
}

// { [medication_id]: [{ id, given_time, given_by_username }] } para un día
function dosesOn(medicationIds, day) {
  if (medicationIds.length === 0) return {}
  const rows = db.prepare(`
    SELECT d.id, d.medication_id, d.given_time, u.username AS given_by_username
    FROM medication_doses d LEFT JOIN users u ON u.id = d.given_by
    WHERE d.given_on = ? AND d.medication_id IN (${medicationIds.map(() => '?').join(',')})
    ORDER BY d.given_time, d.id
  `).all(day, ...medicationIds)
  const out = {}
  for (const { medication_id, ...dose } of rows) (out[medication_id] ||= []).push(dose)
  return out
}

module.exports = { listReminders }
