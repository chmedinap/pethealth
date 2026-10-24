const express = require('express')
const db = require('../db')
const { ACCESSIBLE_PETS_SQL } = require('../access')
const { clean, isBlank } = require('../validate')

// Directorio personal de veterinarios y clínicas. Las consultas siguen guardando
// el nombre como texto: así una mascota compartida no depende del directorio de nadie.
const router = express.Router()
const FIELDS = ['name', 'clinic', 'phone', 'email', 'address', 'notes']

function validateVet(v) {
  if (isBlank(v.name)) return 'name es requerido'
  if (clean(v.email) != null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v.email))) return 'email inválido'
  return null
}

const normalize = (field, value) => {
  const v = clean(value)
  return v == null ? null : String(v).trim() || null
}

function listVets(userId) {
  return db.prepare('SELECT * FROM vets WHERE user_id = ? ORDER BY name COLLATE NOCASE').all(userId)
}

// Solo los del propio usuario; un id ajeno responde 404
function loadVet(req, res, next) {
  req.vet = db.prepare('SELECT * FROM vets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!req.vet) return res.status(404).json({ error: 'Veterinario no encontrado' })
  next()
}

router.get('/', (req, res) => {
  res.json(listVets(req.user.id))
})

router.post('/', (req, res) => {
  const error = validateVet(req.body)
  if (error) return res.status(400).json({ error })

  const result = db.prepare(`
    INSERT INTO vets (user_id, ${FIELDS.join(', ')}) VALUES (?, ${FIELDS.map(() => '?').join(', ')})
  `).run(req.user.id, ...FIELDS.map(f => normalize(f, req.body[f])))
  res.status(201).json(db.prepare('SELECT * FROM vets WHERE id = ?').get(result.lastInsertRowid))
})

// POST /api/vets/import-history — crea entradas a partir de los veterinarios que
// aparecen en las consultas y vacunas de las mascotas del usuario
router.post('/import-history', (req, res) => {
  const seen = db.prepare(`
    SELECT trim(vet_name) AS name, trim(clinic_name) AS clinic, MAX(checkup_date) AS last
    FROM checkups WHERE pet_id IN (${ACCESSIBLE_PETS_SQL}) AND trim(vet_name) <> ''
    GROUP BY lower(trim(vet_name))
    UNION ALL
    SELECT trim(vet_name), NULL, MAX(date_given)
    FROM vaccines WHERE pet_id IN (${ACCESSIBLE_PETS_SQL}) AND trim(COALESCE(vet_name, '')) <> ''
    GROUP BY lower(trim(vet_name))
    ORDER BY last DESC
  `).all({ userId: req.user.id })

  const existing = new Set(listVets(req.user.id).map(v => v.name.toLowerCase()))
  const insert = db.prepare('INSERT INTO vets (user_id, name, clinic) VALUES (?, ?, ?)')
  let added = 0
  db.transaction(() => {
    for (const { name, clinic } of seen) {
      if (existing.has(name.toLowerCase())) continue
      existing.add(name.toLowerCase())
      insert.run(req.user.id, name, clinic || null)
      added++
    }
  })()
  res.json({ added, vets: listVets(req.user.id) })
})

router.put('/:id', loadVet, (req, res) => {
  const fields = Object.keys(req.body).filter(k => FIELDS.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

  const error = validateVet({ ...req.vet, ...req.body })
  if (error) return res.status(400).json({ error })

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  db.prepare(`UPDATE vets SET ${setClause} WHERE id = ?`).run(...fields.map(f => normalize(f, req.body[f])), req.vet.id)
  res.json(db.prepare('SELECT * FROM vets WHERE id = ?').get(req.vet.id))
})

router.delete('/:id', loadVet, (req, res) => {
  db.prepare('DELETE FROM vets WHERE id = ?').run(req.vet.id)
  res.json({ message: 'Veterinario eliminado' })
})

module.exports = router
