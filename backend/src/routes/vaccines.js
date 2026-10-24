const express = require('express')
const db = require('../db')
const { requireAccess } = require('../access')
const { clean, isISODate, isBlank, isValidCost, cleanCost } = require('../validate')

const FIELDS = ['name', 'date_given', 'next_due_date', 'vet_name', 'batch_number', 'notes', 'cost']

function validateVaccine(v) {
  if (isBlank(v.name)) return 'name es requerido'
  if (!isISODate(v.date_given)) return 'date_given debe tener formato YYYY-MM-DD'
  if (v.next_due_date) {
    if (!isISODate(v.next_due_date)) return 'next_due_date debe tener formato YYYY-MM-DD'
    if (v.next_due_date < v.date_given) return 'next_due_date no puede ser anterior a date_given'
  }
  if (!isValidCost(v.cost)) return 'cost debe ser un número mayor o igual a 0'
  return null
}

// ── Router montado en /api/pets ───────────────────────────────────────────────
const petRouter = express.Router()

petRouter.get('/:petId/vaccines', requireAccess('pet', 'viewer', 'petId'), (req, res) => {
  res.json(db.prepare('SELECT * FROM vaccines WHERE pet_id = ? ORDER BY date_given DESC, id DESC').all(req.pet.id))
})

petRouter.post('/:petId/vaccines', requireAccess('pet', 'editor', 'petId'), (req, res) => {
  const error = validateVaccine(req.body)
  if (error) return res.status(400).json({ error })

  const v = req.body
  const result = db.prepare(`
    INSERT INTO vaccines (pet_id, name, date_given, next_due_date, vet_name, batch_number, notes, cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.pet.id, String(v.name).trim(), v.date_given, clean(v.next_due_date), clean(v.vet_name), clean(v.batch_number), clean(v.notes), cleanCost(v.cost))

  res.status(201).json(db.prepare('SELECT * FROM vaccines WHERE id = ?').get(result.lastInsertRowid))
})

// ── Router montado en /api/vaccines ───────────────────────────────────────────
const vaccineRouter = express.Router()

vaccineRouter.put('/:id', requireAccess('vaccine', 'editor'), (req, res) => {
  const fields = Object.keys(req.body).filter(k => FIELDS.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

  const error = validateVaccine({ ...req.vaccine, ...req.body })
  if (error) return res.status(400).json({ error })

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const value = f => (f === 'cost' ? cleanCost(req.body.cost) : clean(req.body[f]))
  db.prepare(`UPDATE vaccines SET ${setClause} WHERE id = ?`).run(...fields.map(value), req.vaccine.id)
  res.json(db.prepare('SELECT * FROM vaccines WHERE id = ?').get(req.vaccine.id))
})

vaccineRouter.delete('/:id', requireAccess('vaccine', 'editor'), (req, res) => {
  db.prepare('DELETE FROM vaccines WHERE id = ?').run(req.vaccine.id)
  res.json({ message: 'Vacuna eliminada' })
})

module.exports = { petRouter, vaccineRouter }
