const express = require('express')
const db = require('../db')
const { requireAccess } = require('../access')
const { clean, isISODate } = require('../validate')
const { uploadAttachment, removeFiles } = require('../files')

const MAX_ATTACHMENTS = 3

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMedications(checkupId) {
  return db.prepare('SELECT * FROM medications WHERE checkup_id = ?').all(checkupId)
}

function getAttachments(checkupId) {
  return db.prepare(
    "SELECT * FROM attachments WHERE entity_type = 'checkup' AND entity_id = ? ORDER BY created_at ASC"
  ).all(checkupId)
}

function fullCheckup(checkup) {
  return {
    ...checkup,
    medications: getMedications(checkup.id),
    attachments: getAttachments(checkup.id),
  }
}

function validateMedication(med) {
  if (!med || !String(med.name || '').trim()) return 'name es requerido en cada medicamento'
  if (!String(med.frequency || '').trim()) return 'frequency es requerido en cada medicamento'
  return null
}

// ── Router montado en /api/pets ───────────────────────────────────────────────
const petRouter = express.Router()

petRouter.get('/:petId/checkups', requireAccess('pet', 'viewer', 'petId'), (req, res) => {
  const checkups = db.prepare(
    'SELECT * FROM checkups WHERE pet_id = ? ORDER BY checkup_date DESC'
  ).all(req.pet.id)
  res.json(checkups.map(fullCheckup))
})

petRouter.post('/:petId/checkups', requireAccess('pet', 'editor', 'petId'), (req, res) => {
  const { vet_name, clinic_name, checkup_date, reason, diagnosis, observations, next_visit_date, medications } = req.body
  if (!vet_name || !checkup_date || !reason) {
    return res.status(400).json({ error: 'vet_name, checkup_date y reason son requeridos' })
  }
  if (!isISODate(checkup_date) || (next_visit_date && !isISODate(next_visit_date))) {
    return res.status(400).json({ error: 'Las fechas deben tener formato YYYY-MM-DD' })
  }
  const meds = Array.isArray(medications) ? medications : []
  for (const med of meds) {
    const error = validateMedication(med)
    if (error) return res.status(400).json({ error })
  }

  const insert = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO checkups (pet_id, vet_name, clinic_name, checkup_date, reason, diagnosis, observations, next_visit_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.pet.id, vet_name, clean(clinic_name), checkup_date, reason, clean(diagnosis), clean(observations), clean(next_visit_date))

    const checkupId = result.lastInsertRowid
    const insertMed = db.prepare(`
      INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const med of meds) {
      insertMed.run(checkupId, med.name, clean(med.concentration), med.frequency, clean(med.duration_days), clean(med.notes))
    }
    return checkupId
  })

  const checkupId = insert()
  res.status(201).json(fullCheckup(db.prepare('SELECT * FROM checkups WHERE id = ?').get(checkupId)))
})

// ── Router montado en /api/checkups ──────────────────────────────────────────
const checkupRouter = express.Router()

checkupRouter.get('/:id', requireAccess('checkup', 'viewer'), (req, res) => {
  res.json(fullCheckup(req.checkup))
})

checkupRouter.put('/:id', requireAccess('checkup', 'editor'), (req, res) => {
  const allowed = ['vet_name', 'clinic_name', 'checkup_date', 'reason', 'diagnosis', 'observations', 'next_visit_date']
  const fields = Object.keys(req.body).filter(k => allowed.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })
  for (const required of ['vet_name', 'checkup_date', 'reason']) {
    if (fields.includes(required) && !String(req.body[required] || '').trim()) {
      return res.status(400).json({ error: `${required} no puede estar vacío` })
    }
  }
  for (const f of ['checkup_date', 'next_visit_date']) {
    if (fields.includes(f) && clean(req.body[f]) != null && !isISODate(req.body[f])) {
      return res.status(400).json({ error: 'Las fechas deben tener formato YYYY-MM-DD' })
    }
  }

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  db.prepare(`UPDATE checkups SET ${setClause} WHERE id = ?`).run(...fields.map(f => clean(req.body[f])), req.checkup.id)

  res.json(fullCheckup(db.prepare('SELECT * FROM checkups WHERE id = ?').get(req.checkup.id)))
})

checkupRouter.delete('/:id', requireAccess('checkup', 'editor'), (req, res) => {
  const files = getAttachments(req.checkup.id).map(a => a.file_url)
  // El trigger trg_checkup_attachments borra las filas de attachments
  db.prepare('DELETE FROM checkups WHERE id = ?').run(req.checkup.id)
  removeFiles(files)
  res.json({ message: 'Checkup eliminado' })
})

checkupRouter.get('/:id/medications', requireAccess('checkup', 'viewer'), (req, res) => {
  res.json(getMedications(req.checkup.id))
})

checkupRouter.post('/:id/medications', requireAccess('checkup', 'editor'), (req, res) => {
  const error = validateMedication(req.body)
  if (error) return res.status(400).json({ error })

  const { name, concentration, frequency, duration_days, notes } = req.body
  const result = db.prepare(`
    INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.checkup.id, name, clean(concentration), frequency, clean(duration_days), clean(notes))

  res.status(201).json(db.prepare('SELECT * FROM medications WHERE id = ?').get(result.lastInsertRowid))
})

// GET /api/checkups/:id/attachments
checkupRouter.get('/:id/attachments', requireAccess('checkup', 'viewer'), (req, res) => {
  res.json(getAttachments(req.checkup.id))
})

// Rechaza antes de escribir el archivo si ya se alcanzó el máximo
function checkAttachmentLimit(req, res, next) {
  const { cnt } = db.prepare(
    "SELECT COUNT(*) as cnt FROM attachments WHERE entity_type = 'checkup' AND entity_id = ?"
  ).get(req.checkup.id)
  if (cnt >= MAX_ATTACHMENTS) return res.status(400).json({ error: `Máximo ${MAX_ATTACHMENTS} archivos por checkup` })
  next()
}

// POST /api/checkups/:id/attachments
checkupRouter.post('/:id/attachments', requireAccess('checkup', 'editor'), checkAttachmentLimit, uploadAttachment.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

  const file_url = `/uploads/attachments/${req.file.filename}`
  const file_type = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image'

  const result = db.prepare(`
    INSERT INTO attachments (entity_type, entity_id, file_url, file_name, file_type)
    VALUES ('checkup', ?, ?, ?, ?)
  `).run(req.checkup.id, file_url, req.file.originalname, file_type)

  res.status(201).json(db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid))
})

// ── Router montado en /api/medications ───────────────────────────────────────
const medicationRouter = express.Router()

medicationRouter.put('/:id', requireAccess('medication', 'editor'), (req, res) => {
  const allowed = ['name', 'concentration', 'frequency', 'duration_days', 'notes']
  const fields = Object.keys(req.body).filter(k => allowed.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

  const error = validateMedication({ ...req.medication, ...req.body })
  if (error) return res.status(400).json({ error })

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  db.prepare(`UPDATE medications SET ${setClause} WHERE id = ?`).run(...fields.map(f => clean(req.body[f])), req.medication.id)

  res.json(db.prepare('SELECT * FROM medications WHERE id = ?').get(req.medication.id))
})

medicationRouter.delete('/:id', requireAccess('medication', 'editor'), (req, res) => {
  db.prepare('DELETE FROM medications WHERE id = ?').run(req.medication.id)
  res.json({ message: 'Medicamento eliminado' })
})

module.exports = { petRouter, checkupRouter, medicationRouter }
