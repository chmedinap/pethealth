const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const db = require('../db')

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

// ── Multer para adjuntos de checkup ──────────────────────────────────────────
const attachmentStorage = multer.diskStorage({
  destination: '/app/data/uploads/attachments/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `checkup-${req.params.id}-${Date.now()}${ext}`)
  },
})
const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    cb(null, allowed.includes(file.mimetype))
  },
})

// ── Router montado en /api/pets ───────────────────────────────────────────────
const petRouter = express.Router()

petRouter.get('/:petId/checkups', (req, res) => {
  try {
    const checkups = db.prepare(
      'SELECT * FROM checkups WHERE pet_id = ? ORDER BY checkup_date DESC'
    ).all(req.params.petId)
    res.json(checkups.map(fullCheckup))
  } catch (err) {
    console.error('GET /pets/:petId/checkups', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

petRouter.post('/:petId/checkups', (req, res) => {
  try {
    const { vet_name, clinic_name, checkup_date, reason, diagnosis, observations, next_visit_date, medications } = req.body
    if (!vet_name || !checkup_date || !reason) {
      return res.status(400).json({ error: 'vet_name, checkup_date y reason son requeridos' })
    }

    const insert = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO checkups (pet_id, vet_name, clinic_name, checkup_date, reason, diagnosis, observations, next_visit_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.petId, vet_name, clinic_name ?? null, checkup_date, reason, diagnosis ?? null, observations ?? null, next_visit_date ?? null)

      const checkupId = result.lastInsertRowid
      if (Array.isArray(medications)) {
        const insertMed = db.prepare(`
          INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        for (const med of medications) {
          insertMed.run(checkupId, med.name, med.concentration ?? null, med.frequency, med.duration_days ?? null, med.notes ?? null)
        }
      }
      return checkupId
    })

    const checkupId = insert()
    res.status(201).json(fullCheckup(db.prepare('SELECT * FROM checkups WHERE id = ?').get(checkupId)))
  } catch (err) {
    console.error('POST /pets/:petId/checkups', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ── Router montado en /api/checkups ──────────────────────────────────────────
const checkupRouter = express.Router()

checkupRouter.get('/:id', (req, res) => {
  try {
    const checkup = db.prepare('SELECT * FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) return res.status(404).json({ error: 'Checkup no encontrado' })
    res.json(fullCheckup(checkup))
  } catch (err) {
    console.error('GET /checkups/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

checkupRouter.put('/:id', (req, res) => {
  try {
    const checkup = db.prepare('SELECT * FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) return res.status(404).json({ error: 'Checkup no encontrado' })

    const allowed = ['vet_name', 'clinic_name', 'checkup_date', 'reason', 'diagnosis', 'observations', 'next_visit_date']
    const fields = Object.keys(req.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

    const setClause = fields.map(f => `${f} = ?`).join(', ')
    db.prepare(`UPDATE checkups SET ${setClause} WHERE id = ?`).run(...fields.map(f => req.body[f]), req.params.id)

    res.json(fullCheckup(db.prepare('SELECT * FROM checkups WHERE id = ?').get(req.params.id)))
  } catch (err) {
    console.error('PUT /checkups/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

checkupRouter.delete('/:id', (req, res) => {
  try {
    const checkup = db.prepare('SELECT * FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) return res.status(404).json({ error: 'Checkup no encontrado' })

    // Eliminar archivos adjuntos físicos
    const attachments = getAttachments(req.params.id)
    for (const att of attachments) {
      fs.unlink(`/app/data${att.file_url}`, () => {})
    }

    db.prepare('DELETE FROM checkups WHERE id = ?').run(req.params.id)
    res.json({ message: 'Checkup eliminado' })
  } catch (err) {
    console.error('DELETE /checkups/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

checkupRouter.get('/:id/medications', (req, res) => {
  try {
    const checkup = db.prepare('SELECT id FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) return res.status(404).json({ error: 'Checkup no encontrado' })
    res.json(getMedications(req.params.id))
  } catch (err) {
    console.error('GET /checkups/:id/medications', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

checkupRouter.post('/:id/medications', (req, res) => {
  try {
    const checkup = db.prepare('SELECT id FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) return res.status(404).json({ error: 'Checkup no encontrado' })

    const { name, concentration, frequency, duration_days, notes } = req.body
    if (!name || !frequency) return res.status(400).json({ error: 'name y frequency son requeridos' })

    const result = db.prepare(`
      INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, name, concentration ?? null, frequency, duration_days ?? null, notes ?? null)

    res.status(201).json(db.prepare('SELECT * FROM medications WHERE id = ?').get(result.lastInsertRowid))
  } catch (err) {
    console.error('POST /checkups/:id/medications', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/checkups/:id/attachments
checkupRouter.get('/:id/attachments', (req, res) => {
  try {
    res.json(getAttachments(req.params.id))
  } catch (err) {
    console.error('GET /checkups/:id/attachments', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/checkups/:id/attachments
checkupRouter.post('/:id/attachments', uploadAttachment.single('file'), (req, res) => {
  try {
    const checkup = db.prepare('SELECT id FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) {
      if (req.file) fs.unlink(req.file.path, () => {})
      return res.status(404).json({ error: 'Checkup no encontrado' })
    }

    const count = db.prepare(
      "SELECT COUNT(*) as cnt FROM attachments WHERE entity_type = 'checkup' AND entity_id = ?"
    ).get(req.params.id)

    if (count.cnt >= 3) {
      if (req.file) fs.unlink(req.file.path, () => {})
      return res.status(400).json({ error: 'Máximo 3 archivos por checkup' })
    }

    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

    const file_url = `/uploads/attachments/${req.file.filename}`
    const file_type = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image'

    const result = db.prepare(`
      INSERT INTO attachments (entity_type, entity_id, file_url, file_name, file_type)
      VALUES ('checkup', ?, ?, ?, ?)
    `).run(req.params.id, file_url, req.file.originalname, file_type)

    res.status(201).json(db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid))
  } catch (err) {
    console.error('POST /checkups/:id/attachments', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ── Router montado en /api/medications ───────────────────────────────────────
const medicationRouter = express.Router()

medicationRouter.put('/:id', (req, res) => {
  try {
    const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.id)
    if (!med) return res.status(404).json({ error: 'Medicamento no encontrado' })

    const allowed = ['name', 'concentration', 'frequency', 'duration_days', 'notes']
    const fields = Object.keys(req.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

    const setClause = fields.map(f => `${f} = ?`).join(', ')
    db.prepare(`UPDATE medications SET ${setClause} WHERE id = ?`).run(...fields.map(f => req.body[f]), req.params.id)

    res.json(db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.id))
  } catch (err) {
    console.error('PUT /medications/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

medicationRouter.delete('/:id', (req, res) => {
  try {
    const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.id)
    if (!med) return res.status(404).json({ error: 'Medicamento no encontrado' })
    db.prepare('DELETE FROM medications WHERE id = ?').run(req.params.id)
    res.json({ message: 'Medicamento eliminado' })
  } catch (err) {
    console.error('DELETE /medications/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = { petRouter, checkupRouter, medicationRouter }
