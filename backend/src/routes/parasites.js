const express = require('express')
const db = require('../db')
const { requireAccess } = require('../access')
const { clean, isISODate, isBlank, isValidCost, cleanCost } = require('../validate')

const KINDS = ['internal', 'external', 'combined']
const FIELDS = ['kind', 'product', 'date_given', 'next_due_date', 'cost', 'notes']

function validateTreatment(t) {
  if (!KINDS.includes(t.kind)) return `kind debe ser una de: ${KINDS.join(', ')}`
  if (isBlank(t.product)) return 'product es requerido'
  if (!isISODate(t.date_given)) return 'date_given debe tener formato YYYY-MM-DD'
  if (clean(t.next_due_date) != null) {
    if (!isISODate(t.next_due_date)) return 'next_due_date debe tener formato YYYY-MM-DD'
    if (t.next_due_date < t.date_given) return 'next_due_date no puede ser anterior a date_given'
  }
  if (!isValidCost(t.cost)) return 'cost debe ser un número mayor o igual a 0'
  return null
}

const normalize = (field, value) => (field === 'cost' ? cleanCost(value) : field === 'product' ? String(value).trim() : clean(value))

// ── Router montado en /api/pets ───────────────────────────────────────────────
const petRouter = express.Router()

petRouter.get('/:petId/parasites', requireAccess('pet', 'viewer', 'petId'), (req, res) => {
  res.json(db.prepare('SELECT * FROM parasite_treatments WHERE pet_id = ? ORDER BY date_given DESC, id DESC').all(req.pet.id))
})

petRouter.post('/:petId/parasites', requireAccess('pet', 'editor', 'petId'), (req, res) => {
  const error = validateTreatment(req.body)
  if (error) return res.status(400).json({ error })

  const result = db.prepare(`
    INSERT INTO parasite_treatments (pet_id, ${FIELDS.join(', ')}) VALUES (?, ${FIELDS.map(() => '?').join(', ')})
  `).run(req.pet.id, ...FIELDS.map(f => normalize(f, req.body[f])))

  res.status(201).json(db.prepare('SELECT * FROM parasite_treatments WHERE id = ?').get(result.lastInsertRowid))
})

// ── Router montado en /api/parasites ──────────────────────────────────────────
const parasiteRouter = express.Router()

parasiteRouter.put('/:id', requireAccess('parasite', 'editor'), (req, res) => {
  const fields = Object.keys(req.body).filter(k => FIELDS.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

  const error = validateTreatment({ ...req.parasite, ...req.body })
  if (error) return res.status(400).json({ error })

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  db.prepare(`UPDATE parasite_treatments SET ${setClause} WHERE id = ?`).run(...fields.map(f => normalize(f, req.body[f])), req.parasite.id)
  res.json(db.prepare('SELECT * FROM parasite_treatments WHERE id = ?').get(req.parasite.id))
})

parasiteRouter.delete('/:id', requireAccess('parasite', 'editor'), (req, res) => {
  db.prepare('DELETE FROM parasite_treatments WHERE id = ?').run(req.parasite.id)
  res.json({ message: 'Tratamiento eliminado' })
})

module.exports = { petRouter, parasiteRouter, PARASITE_KINDS: KINDS }
