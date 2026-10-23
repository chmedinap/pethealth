const express = require('express')
const db = require('../db')
const { requireAccess } = require('../access')
const { clean, isISODate } = require('../validate')

// pets.weight_kg es siempre el registro más reciente del historial
function syncPetWeight(petId) {
  db.prepare(`
    UPDATE pets SET weight_kg = COALESCE(
      (SELECT weight_kg FROM weight_logs WHERE pet_id = @petId ORDER BY measured_on DESC, id DESC LIMIT 1),
      weight_kg
    ) WHERE id = @petId
  `).run({ petId })
}

// Una medición por día: registrar dos veces la misma fecha actualiza la existente
function recordWeight(petId, weightKg, measuredOn, notes = null) {
  const existing = db.prepare('SELECT id FROM weight_logs WHERE pet_id = ? AND measured_on = ?').get(petId, measuredOn)
  let id
  if (existing) {
    db.prepare('UPDATE weight_logs SET weight_kg = ?, notes = COALESCE(?, notes) WHERE id = ?').run(weightKg, notes, existing.id)
    id = existing.id
  } else {
    id = db.prepare('INSERT INTO weight_logs (pet_id, measured_on, weight_kg, notes) VALUES (?, ?, ?, ?)')
      .run(petId, measuredOn, weightKg, notes).lastInsertRowid
  }
  syncPetWeight(petId)
  return db.prepare('SELECT * FROM weight_logs WHERE id = ?').get(id)
}

function listWeights(petId) {
  return db.prepare('SELECT * FROM weight_logs WHERE pet_id = ? ORDER BY measured_on ASC, id ASC').all(petId)
}

// ── Router montado en /api/pets ───────────────────────────────────────────────
const petRouter = express.Router()

petRouter.get('/:petId/weights', requireAccess('pet', 'viewer', 'petId'), (req, res) => {
  res.json(listWeights(req.pet.id))
})

petRouter.post('/:petId/weights', requireAccess('pet', 'editor', 'petId'), (req, res) => {
  const { measured_on, weight_kg, notes } = req.body
  if (!isISODate(measured_on)) return res.status(400).json({ error: 'measured_on debe tener formato YYYY-MM-DD' })
  if (!(Number(weight_kg) > 0)) return res.status(400).json({ error: 'weight_kg debe ser un número positivo' })

  const log = db.transaction(() => recordWeight(req.pet.id, Number(weight_kg), measured_on, clean(notes)))()
  res.status(201).json(log)
})

// ── Router montado en /api/weights ────────────────────────────────────────────
const weightRouter = express.Router()

weightRouter.delete('/:id', requireAccess('weight', 'editor'), (req, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM weight_logs WHERE id = ?').run(req.weight.id)
    syncPetWeight(req.weight.pet_id)
  })()
  res.json({ message: 'Registro eliminado' })
})

module.exports = { petRouter, weightRouter, recordWeight }
