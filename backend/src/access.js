const db = require('./db')

// Niveles de acceso a una mascota. Un nivel superior incluye a los inferiores.
//   viewer — ver la mascota y su historial
//   editor — además crear/editar/borrar registros (consultas, exámenes, vacunas, peso, dosis…)
//   owner  — además borrar la mascota y gestionar con quién se comparte
const RANK = { viewer: 1, editor: 2, owner: 3 }

function petAccess(petId, userId) {
  const row = db.prepare(`
    SELECT CASE WHEN p.user_id = @userId THEN 'owner' ELSE s.role END AS access
    FROM pets p
    LEFT JOIN pet_shares s ON s.pet_id = p.id AND s.user_id = @userId
    WHERE p.id = @petId
  `).get({ petId, userId })
  return row?.access || null
}

function hasAccess(access, need) {
  return !!access && RANK[access] >= RANK[need]
}

// Cada consulta devuelve el registro y el id de la mascota a la que pertenece (_pet_id)
const LOOKUPS = {
  pet: 'SELECT p.*, p.id AS _pet_id, u.username AS owner_username FROM pets p JOIN users u ON u.id = p.user_id WHERE p.id = ?',
  checkup: 'SELECT *, pet_id AS _pet_id FROM checkups WHERE id = ?',
  exam: 'SELECT *, pet_id AS _pet_id FROM exams WHERE id = ?',
  medication: 'SELECT m.*, c.pet_id AS _pet_id FROM medications m JOIN checkups c ON c.id = m.checkup_id WHERE m.id = ?',
  examValue: 'SELECT v.*, e.pet_id AS _pet_id FROM exam_values v JOIN exams e ON e.id = v.exam_id WHERE v.id = ?',
  attachment: `
    SELECT a.*, COALESCE(c.pet_id, e.pet_id) AS _pet_id FROM attachments a
    LEFT JOIN checkups c ON a.entity_type = 'checkup' AND c.id = a.entity_id
    LEFT JOIN exams e    ON a.entity_type = 'exam'    AND e.id = a.entity_id
    WHERE a.id = ?`,
  vaccine: 'SELECT *, pet_id AS _pet_id FROM vaccines WHERE id = ?',
  weight: 'SELECT *, pet_id AS _pet_id FROM weight_logs WHERE id = ?',
  dose: `
    SELECT d.*, c.pet_id AS _pet_id FROM medication_doses d
    JOIN medications m ON m.id = d.medication_id
    JOIN checkups c ON c.id = m.checkup_id
    WHERE d.id = ?`,
  parasite: 'SELECT *, pet_id AS _pet_id FROM parasite_treatments WHERE id = ?',
  condition: 'SELECT *, pet_id AS _pet_id FROM pet_conditions WHERE id = ?',
}

const NOT_FOUND = {
  pet: 'Mascota no encontrada',
  checkup: 'Checkup no encontrado',
  exam: 'Examen no encontrado',
  medication: 'Medicamento no encontrado',
  examValue: 'Valor no encontrado',
  attachment: 'Archivo no encontrado',
  vaccine: 'Vacuna no encontrada',
  weight: 'Registro de peso no encontrado',
  dose: 'Dosis no encontrada',
  parasite: 'Tratamiento antiparasitario no encontrado',
  condition: 'Condición no encontrada',
}

// → { row } si el usuario tiene el nivel pedido; { status } en caso contrario.
// Sin ningún acceso se responde 404 para no revelar que el registro existe.
function findAccessible(kind, id, userId, need = 'viewer') {
  const found = db.prepare(LOOKUPS[kind]).get(id)
  if (!found) return { status: 404 }
  const access = petAccess(found._pet_id, userId)
  if (!access) return { status: 404 }
  if (!hasAccess(access, need)) return { status: 403 }
  const { _pet_id, ...row } = found
  return { row: kind === 'pet' ? { ...row, access } : row, petId: _pet_id, access }
}

// Middleware: carga el registro en req[kind] (y su nivel en req.access) o responde 404/403
function requireAccess(kind, need = 'viewer', param = 'id') {
  return (req, res, next) => {
    const result = findAccessible(kind, req.params[param], req.user.id, need)
    if (result.status === 404) return res.status(404).json({ error: NOT_FOUND[kind] })
    if (result.status === 403) {
      return res.status(403).json({ error: need === 'owner'
        ? 'Solo el dueño de la mascota puede hacer esto'
        : 'Tienes acceso de solo lectura a esta mascota' })
    }
    req[kind] = result.row
    req.access = result.access
    next()
  }
}

// ¿Puede el usuario ver el archivo servido en `fileUrl`?
function canReadFile(fileUrl, userId) {
  const row = db.prepare(`
    SELECT id AS pet_id FROM pets WHERE photo_url = @url
    UNION ALL
    SELECT pet_id FROM exams WHERE pdf_url = @url
    UNION ALL
    SELECT COALESCE(c.pet_id, e.pet_id) FROM attachments a
      LEFT JOIN checkups c ON a.entity_type = 'checkup' AND c.id = a.entity_id
      LEFT JOIN exams e    ON a.entity_type = 'exam'    AND e.id = a.entity_id
      WHERE a.file_url = @url
    LIMIT 1
  `).get({ url: fileUrl })
  return !!row && !!petAccess(row.pet_id, userId)
}

// Ids de todas las mascotas que el usuario puede ver (propias y compartidas)
const ACCESSIBLE_PETS_SQL = `
  SELECT id FROM pets WHERE user_id = @userId
  UNION
  SELECT pet_id FROM pet_shares WHERE user_id = @userId
`

module.exports = {
  RANK,
  petAccess,
  hasAccess,
  findAccessible,
  requireAccess,
  canReadFile,
  ACCESSIBLE_PETS_SQL,
}
