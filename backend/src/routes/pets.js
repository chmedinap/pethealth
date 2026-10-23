const express = require('express')
const db = require('../db')
const { getOwnedPet } = require('../access')
const { uploadPhoto, removeFile, removeFiles } = require('../files')

const router = express.Router()

const SPECIES = ['cat', 'dog']
const GENDERS = ['male', 'female']

function validatePet(body, partial = false) {
  if (!partial || 'name' in body) {
    if (!body.name || !String(body.name).trim()) return 'name es requerido'
  }
  if (!partial || 'species' in body) {
    if (!SPECIES.includes(body.species)) return 'species debe ser cat o dog'
  }
  if (body.gender && !GENDERS.includes(body.gender)) return 'gender debe ser male o female'
  if (body.weight_kg != null && body.weight_kg !== '' && !(Number(body.weight_kg) >= 0)) return 'weight_kg inválido'
  return null
}

// Normaliza '' → null para que los campos opcionales se puedan vaciar
function clean(value) {
  return value === '' || value === undefined ? null : value
}

// Carga la mascota del usuario en req.pet o responde 404
function requirePet(req, res, next) {
  req.pet = getOwnedPet(req.params.id, req.user.id)
  if (!req.pet) return res.status(404).json({ error: 'Mascota no encontrada' })
  next()
}

// Todos los archivos asociados a una mascota (foto, PDFs, adjuntos)
function petFileUrls(petId) {
  return db.prepare(`
    SELECT photo_url AS url FROM pets WHERE id = @petId AND photo_url IS NOT NULL
    UNION ALL
    SELECT pdf_url FROM exams WHERE pet_id = @petId AND pdf_url IS NOT NULL
    UNION ALL
    SELECT a.file_url FROM attachments a
      JOIN checkups c ON a.entity_type = 'checkup' AND c.id = a.entity_id
      WHERE c.pet_id = @petId
    UNION ALL
    SELECT a.file_url FROM attachments a
      JOIN exams e ON a.entity_type = 'exam' AND e.id = a.entity_id
      WHERE e.pet_id = @petId
  `).all({ petId }).map(r => r.url)
}

// GET /api/pets
router.get('/', (req, res) => {
  const pets = db.prepare(`
    SELECT p.*,
      (SELECT MAX(checkup_date) FROM checkups WHERE pet_id = p.id) AS last_checkup
    FROM pets p
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.user.id)
  res.json(pets)
})

// POST /api/pets
router.post('/', (req, res) => {
  const error = validatePet(req.body)
  if (error) return res.status(400).json({ error })

  const { name, species, breed, birth_date, gender, weight_kg, notes } = req.body
  const result = db.prepare(`
    INSERT INTO pets (user_id, name, species, breed, birth_date, gender, weight_kg, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, String(name).trim(), species, clean(breed), clean(birth_date), clean(gender), clean(weight_kg), clean(notes))

  res.status(201).json(db.prepare('SELECT * FROM pets WHERE id = ?').get(result.lastInsertRowid))
})

// GET /api/pets/:id
router.get('/:id', requirePet, (req, res) => {
  res.json(req.pet)
})

// PUT /api/pets/:id
router.put('/:id', requirePet, (req, res) => {
  const allowed = ['name', 'species', 'breed', 'birth_date', 'gender', 'weight_kg', 'notes']
  const fields = Object.keys(req.body).filter(k => allowed.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

  const error = validatePet(req.body, true)
  if (error) return res.status(400).json({ error })

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  db.prepare(`UPDATE pets SET ${setClause} WHERE id = ?`).run(...fields.map(f => clean(req.body[f])), req.pet.id)

  res.json(db.prepare('SELECT * FROM pets WHERE id = ?').get(req.pet.id))
})

// DELETE /api/pets/:id
router.delete('/:id', requirePet, (req, res) => {
  const files = petFileUrls(req.pet.id)
  // ON DELETE CASCADE borra checkups/exams/valores; los triggers borran attachments
  db.prepare('DELETE FROM pets WHERE id = ?').run(req.pet.id)
  removeFiles(files)
  res.json({ message: 'Mascota eliminada' })
})

// POST /api/pets/:id/photo
router.post('/:id/photo', requirePet, uploadPhoto.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna foto' })

  const photo_url = `/uploads/photos/${req.file.filename}`
  db.prepare('UPDATE pets SET photo_url = ? WHERE id = ?').run(photo_url, req.pet.id)
  if (req.pet.photo_url) removeFile(req.pet.photo_url)
  res.json({ photo_url })
})

module.exports = router
