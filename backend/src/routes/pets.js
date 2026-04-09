const express = require('express')
const path = require('path')
const multer = require('multer')
const db = require('../db')

const router = express.Router()

const photoStorage = multer.diskStorage({
  destination: '/app/data/uploads/photos/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `pet-${req.params.id}-${Date.now()}${ext}`)
  },
})
const uploadPhoto = multer({ storage: photoStorage })

// GET /api/pets
router.get('/', (req, res) => {
  try {
    const pets = db.prepare(`
      SELECT p.*,
        (SELECT MAX(checkup_date) FROM checkups WHERE pet_id = p.id) AS last_checkup
      FROM pets p
      ORDER BY p.created_at DESC
    `).all()
    res.json(pets)
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/pets
router.post('/', (req, res) => {
  try {
    const { name, species, breed, birth_date, gender, weight_kg, notes } = req.body
    if (!name || !species) {
      return res.status(400).json({ error: 'name y species son requeridos' })
    }
    const result = db.prepare(`
      INSERT INTO pets (name, species, breed, birth_date, gender, weight_kg, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, species, breed ?? null, birth_date ?? null, gender ?? null, weight_kg ?? null, notes ?? null)

    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(pet)
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/pets/:id
router.get('/:id', (req, res) => {
  try {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id)
    if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' })
    res.json(pet)
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/pets/:id
router.put('/:id', (req, res) => {
  try {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id)
    if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' })

    const allowed = ['name', 'species', 'breed', 'birth_date', 'gender', 'weight_kg', 'notes']
    const fields = Object.keys(req.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => req.body[f])
    db.prepare(`UPDATE pets SET ${setClause} WHERE id = ?`).run(...values, req.params.id)

    res.json(db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id))
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/pets/:id
router.delete('/:id', (req, res) => {
  try {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id)
    if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' })
    db.prepare('DELETE FROM pets WHERE id = ?').run(req.params.id)
    res.json({ message: 'Mascota eliminada' })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/pets/:id/photo
router.post('/:id/photo', uploadPhoto.single('photo'), (req, res) => {
  try {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.id)
    if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' })
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna foto' })

    const photo_url = `/uploads/photos/${req.file.filename}`
    db.prepare('UPDATE pets SET photo_url = ? WHERE id = ?').run(photo_url, req.params.id)
    res.json({ photo_url })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
