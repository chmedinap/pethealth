const express = require('express')
const db = require('../db')
const { ACCESSIBLE_PETS_SQL } = require('../access')
const { isISODate, todayISO } = require('../validate')

const router = express.Router()

// GET /api/reminders?today=YYYY-MM-DD&days=30
// `today` lo envía el navegador para usar la fecha local del usuario y no la del servidor.
router.get('/', (req, res) => {
  const today = isISODate(req.query.today) ? req.query.today : todayISO()
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365)
  const params = { userId: req.user.id, today, days }

  // Próxima visita: solo cuenta la de la consulta más reciente de cada mascota
  // (una consulta posterior "cumple" la próxima visita que indicaba la anterior).
  const visits = db.prepare(`
    WITH latest AS (
      SELECT c.*, ROW_NUMBER() OVER (PARTITION BY c.pet_id ORDER BY c.checkup_date DESC, c.id DESC) AS rn
      FROM checkups c
      WHERE c.pet_id IN (${ACCESSIBLE_PETS_SQL})
    )
    SELECT 'visit' AS type, l.id AS ref_id, l.pet_id, p.name AS pet_name, p.species,
           l.next_visit_date AS date, l.reason AS title
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
           l.next_due_date AS date, l.name AS title
    FROM latest l JOIN pets p ON p.id = l.pet_id
    WHERE l.rn = 1 AND l.next_due_date IS NOT NULL
      AND l.next_due_date <= date(@today, '+' || @days || ' days')
  `).all(params)

  // Tratamientos en curso: recetados con duración y cuyo último día es hoy o después
  const medications = db.prepare(`
    SELECT 'medication' AS type, m.id AS ref_id, c.pet_id, p.name AS pet_name, p.species,
           date(c.checkup_date, '+' || (m.duration_days - 1) || ' days') AS date,
           m.name AS title, m.frequency, m.concentration, c.checkup_date AS started_on
    FROM medications m
    JOIN checkups c ON c.id = m.checkup_id
    JOIN pets p ON p.id = c.pet_id
    WHERE c.pet_id IN (${ACCESSIBLE_PETS_SQL})
      AND m.duration_days > 0
      AND c.checkup_date <= @today
      AND date(c.checkup_date, '+' || (m.duration_days - 1) || ' days') >= @today
    ORDER BY date ASC
  `).all(params)

  const withStatus = item => ({ ...item, status: item.date < today ? 'overdue' : 'upcoming' })
  const due = [...visits, ...vaccines].map(withStatus).sort((a, b) => a.date.localeCompare(b.date))

  res.json({
    today,
    days,
    due,
    medications: medications.map(m => ({ ...m, status: 'active' })),
  })
})

module.exports = router
