const express = require('express')
const db = require('../db')
const { requireAccess } = require('../access')
const { clean, isISODate, isBlank } = require('../validate')

// Alergias y enfermedades crónicas: se destacan en el perfil y en el informe
const KINDS = ['allergy', 'chronic']
const FIELDS = ['kind', 'name', 'since', 'notes']

function validateCondition(c) {
  if (!KINDS.includes(c.kind)) return 'kind debe ser allergy o chronic'
  if (isBlank(c.name)) return 'name es requerido'
  if (clean(c.since) != null && !isISODate(c.since)) return 'since debe tener formato YYYY-MM-DD'
  return null
}

const normalize = (field, value) => (field === 'name' ? String(value).trim() : clean(value))

function listConditions(petId) {
  return db.prepare("SELECT * FROM pet_conditions WHERE pet_id = ? ORDER BY kind = 'chronic', name COLLATE NOCASE").all(petId)
}

// ── Router montado en /api/pets ───────────────────────────────────────────────
const petRouter = express.Router()

petRouter.get('/:petId/conditions', requireAccess('pet', 'viewer', 'petId'), (req, res) => {
  res.json(listConditions(req.pet.id))
})

petRouter.post('/:petId/conditions', requireAccess('pet', 'editor', 'petId'), (req, res) => {
  const error = validateCondition(req.body)
  if (error) return res.status(400).json({ error })

  const result = db.prepare(`
    INSERT INTO pet_conditions (pet_id, ${FIELDS.join(', ')}) VALUES (?, ${FIELDS.map(() => '?').join(', ')})
  `).run(req.pet.id, ...FIELDS.map(f => normalize(f, req.body[f])))
  res.status(201).json(db.prepare('SELECT * FROM pet_conditions WHERE id = ?').get(result.lastInsertRowid))
})

// ── Router montado en /api/conditions ─────────────────────────────────────────
const conditionRouter = express.Router()

conditionRouter.put('/:id', requireAccess('condition', 'editor'), (req, res) => {
  const fields = Object.keys(req.body).filter(k => FIELDS.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

  const error = validateCondition({ ...req.condition, ...req.body })
  if (error) return res.status(400).json({ error })

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  db.prepare(`UPDATE pet_conditions SET ${setClause} WHERE id = ?`).run(...fields.map(f => normalize(f, req.body[f])), req.condition.id)
  res.json(db.prepare('SELECT * FROM pet_conditions WHERE id = ?').get(req.condition.id))
})

conditionRouter.delete('/:id', requireAccess('condition', 'editor'), (req, res) => {
  db.prepare('DELETE FROM pet_conditions WHERE id = ?').run(req.condition.id)
  res.json({ message: 'Condición eliminada' })
})

module.exports = { petRouter, conditionRouter, CONDITION_KINDS: KINDS }
