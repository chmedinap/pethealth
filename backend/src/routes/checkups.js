const express = require('express')
const db = require('../db')

const router = express.Router()

function getMedications(checkupId) {
  return db.prepare('SELECT * FROM medications WHERE checkup_id = ?').all(checkupId)
}

// GET /api/pets/:id/checkups
router.get('/pets/:id/checkups', (req, res) => {
  try {
    const checkups = db.prepare(`
      SELECT * FROM checkups WHERE pet_id = ? ORDER BY checkup_date DESC
    `).all(req.params.id)

    const result = checkups.map(c => ({ ...c, medications: getMedications(c.id) }))
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/pets/:id/checkups
router.post('/pets/:id/checkups', (req, res) => {
  try {
    const { vet_name, clinic_name, checkup_date, reason, diagnosis, observations, next_visit_date, medications } = req.body
    if (!vet_name || !checkup_date || !reason) {
      return res.status(400).json({ error: 'vet_name, checkup_date y reason son requeridos' })
    }

    const insertCheckup = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO checkups (pet_id, vet_name, clinic_name, checkup_date, reason, diagnosis, observations, next_visit_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.id, vet_name, clinic_name ?? null, checkup_date, reason, diagnosis ?? null, observations ?? null, next_visit_date ?? null)

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

    const checkupId = insertCheckup()
    const checkup = db.prepare('SELECT * FROM checkups WHERE id = ?').get(checkupId)
    res.status(201).json({ ...checkup, medications: getMedications(checkupId) })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/checkups/:id
router.get('/:id', (req, res) => {
  try {
    const checkup = db.prepare('SELECT * FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) return res.status(404).json({ error: 'Checkup no encontrado' })
    res.json({ ...checkup, medications: getMedications(checkup.id) })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/checkups/:id
router.put('/:id', (req, res) => {
  try {
    const checkup = db.prepare('SELECT * FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) return res.status(404).json({ error: 'Checkup no encontrado' })

    const allowed = ['vet_name', 'clinic_name', 'checkup_date', 'reason', 'diagnosis', 'observations', 'next_visit_date']
    const fields = Object.keys(req.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => req.body[f])
    db.prepare(`UPDATE checkups SET ${setClause} WHERE id = ?`).run(...values, req.params.id)

    const updated = db.prepare('SELECT * FROM checkups WHERE id = ?').get(req.params.id)
    res.json({ ...updated, medications: getMedications(updated.id) })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/checkups/:id
router.delete('/:id', (req, res) => {
  try {
    const checkup = db.prepare('SELECT * FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) return res.status(404).json({ error: 'Checkup no encontrado' })
    db.prepare('DELETE FROM checkups WHERE id = ?').run(req.params.id)
    res.json({ message: 'Checkup eliminado' })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/checkups/:id/medications
router.get('/:id/medications', (req, res) => {
  try {
    const checkup = db.prepare('SELECT id FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) return res.status(404).json({ error: 'Checkup no encontrado' })
    res.json(getMedications(req.params.id))
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/checkups/:id/medications
router.post('/:id/medications', (req, res) => {
  try {
    const checkup = db.prepare('SELECT id FROM checkups WHERE id = ?').get(req.params.id)
    if (!checkup) return res.status(404).json({ error: 'Checkup no encontrado' })

    const { name, concentration, frequency, duration_days, notes } = req.body
    if (!name || !frequency) {
      return res.status(400).json({ error: 'name y frequency son requeridos' })
    }

    const result = db.prepare(`
      INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, name, concentration ?? null, frequency, duration_days ?? null, notes ?? null)

    res.status(201).json(db.prepare('SELECT * FROM medications WHERE id = ?').get(result.lastInsertRowid))
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/medications/:medicationId
router.put('/medications/:medicationId', (req, res) => {
  try {
    const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.medicationId)
    if (!med) return res.status(404).json({ error: 'Medicamento no encontrado' })

    const allowed = ['name', 'concentration', 'frequency', 'duration_days', 'notes']
    const fields = Object.keys(req.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => req.body[f])
    db.prepare(`UPDATE medications SET ${setClause} WHERE id = ?`).run(...values, req.params.medicationId)

    res.json(db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.medicationId))
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/medications/:medicationId
router.delete('/medications/:medicationId', (req, res) => {
  try {
    const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.medicationId)
    if (!med) return res.status(404).json({ error: 'Medicamento no encontrado' })
    db.prepare('DELETE FROM medications WHERE id = ?').run(req.params.medicationId)
    res.json({ message: 'Medicamento eliminado' })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
