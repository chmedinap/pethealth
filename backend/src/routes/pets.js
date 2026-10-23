const express = require('express')
const db = require('../db')
const { requireAccess, ACCESSIBLE_PETS_SQL } = require('../access')
const { uploadPhoto, removeFile, removeFiles } = require('../files')
const { clean, isISODate, todayISO } = require('../validate')
const { recordWeight } = require('./weights')

const router = express.Router()

// La lista vive aquí y no en un CHECK de SQLite: agregar una especie no requiere migración
const SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'rodent', 'ferret', 'reptile', 'fish', 'horse', 'other']
const GENDERS = ['male', 'female']
const SHARE_ROLES = ['viewer', 'editor']

function validatePet(body, partial = false) {
  if (!partial || 'name' in body) {
    if (!body.name || !String(body.name).trim()) return 'name es requerido'
  }
  if (!partial || 'species' in body) {
    if (!SPECIES.includes(body.species)) return `species debe ser una de: ${SPECIES.join(', ')}`
  }
  if (body.gender && !GENDERS.includes(body.gender)) return 'gender debe ser male o female'
  if (body.birth_date && !isISODate(body.birth_date)) return 'birth_date debe tener formato YYYY-MM-DD'
  if (body.weight_kg != null && body.weight_kg !== '' && !(Number(body.weight_kg) > 0)) return 'weight_kg inválido'
  return null
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

// GET /api/pets — propias y compartidas, con el nivel de acceso de cada una
router.get('/', (req, res) => {
  const pets = db.prepare(`
    SELECT p.*,
      CASE WHEN p.user_id = @userId THEN 'owner' ELSE s.role END AS access,
      u.username AS owner_username,
      (SELECT MAX(checkup_date) FROM checkups WHERE pet_id = p.id) AS last_checkup
    FROM pets p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN pet_shares s ON s.pet_id = p.id AND s.user_id = @userId
    WHERE p.id IN (${ACCESSIBLE_PETS_SQL})
    ORDER BY (p.user_id = @userId) DESC, p.created_at DESC
  `).all({ userId: req.user.id })
  res.json(pets)
})

// POST /api/pets
router.post('/', (req, res) => {
  const error = validatePet(req.body)
  if (error) return res.status(400).json({ error })

  const { name, species, breed, birth_date, gender, weight_kg, notes } = req.body
  const create = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO pets (user_id, name, species, breed, birth_date, gender, weight_kg, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, String(name).trim(), species, clean(breed), clean(birth_date), clean(gender), clean(weight_kg), clean(notes))
    if (clean(weight_kg) != null) recordWeight(result.lastInsertRowid, Number(weight_kg), todayISO())
    return result.lastInsertRowid
  })

  const petId = create()
  res.status(201).json({ ...db.prepare('SELECT * FROM pets WHERE id = ?').get(petId), access: 'owner' })
})

// GET /api/pets/:id
router.get('/:id', requireAccess('pet', 'viewer'), (req, res) => {
  res.json(req.pet)
})

// PUT /api/pets/:id
router.put('/:id', requireAccess('pet', 'editor'), (req, res) => {
  const allowed = ['name', 'species', 'breed', 'birth_date', 'gender', 'weight_kg', 'notes']
  const fields = Object.keys(req.body).filter(k => allowed.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

  const error = validatePet(req.body, true)
  if (error) return res.status(400).json({ error })

  const update = db.transaction(() => {
    const setClause = fields.map(f => `${f} = ?`).join(', ')
    db.prepare(`UPDATE pets SET ${setClause} WHERE id = ?`).run(...fields.map(f => clean(req.body[f])), req.pet.id)
    // Un cambio de peso desde el formulario queda registrado en el historial
    const newWeight = clean(req.body.weight_kg)
    if (fields.includes('weight_kg') && newWeight != null && Number(newWeight) !== req.pet.weight_kg) {
      recordWeight(req.pet.id, Number(newWeight), todayISO())
    }
  })
  update()

  res.json({ ...db.prepare('SELECT * FROM pets WHERE id = ?').get(req.pet.id), access: req.access, owner_username: req.pet.owner_username })
})

// DELETE /api/pets/:id — solo el dueño
router.delete('/:id', requireAccess('pet', 'owner'), (req, res) => {
  const files = petFileUrls(req.pet.id)
  // ON DELETE CASCADE borra checkups/exams/vacunas/peso/shares; los triggers borran attachments
  db.prepare('DELETE FROM pets WHERE id = ?').run(req.pet.id)
  removeFiles(files)
  res.json({ message: 'Mascota eliminada' })
})

// POST /api/pets/:id/photo
router.post('/:id/photo', requireAccess('pet', 'editor'), uploadPhoto.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna foto' })

  const photo_url = `/uploads/photos/${req.file.filename}`
  db.prepare('UPDATE pets SET photo_url = ? WHERE id = ?').run(photo_url, req.pet.id)
  if (req.pet.photo_url) removeFile(req.pet.photo_url)
  res.json({ photo_url })
})

// ── Compartir mascotas ────────────────────────────────────────────────────────
function listShares(petId) {
  return db.prepare(`
    SELECT s.user_id, u.username, s.role, s.created_at
    FROM pet_shares s JOIN users u ON u.id = s.user_id
    WHERE s.pet_id = ? ORDER BY u.username
  `).all(petId)
}

// GET /api/pets/:id/shares
router.get('/:id/shares', requireAccess('pet', 'owner'), (req, res) => {
  res.json(listShares(req.pet.id))
})

// POST /api/pets/:id/shares { username, role } — crea o actualiza el acceso
router.post('/:id/shares', requireAccess('pet', 'owner'), (req, res) => {
  const username = String(req.body.username || '').trim()
  const role = req.body.role || 'viewer'
  if (!SHARE_ROLES.includes(role)) return res.status(400).json({ error: 'role debe ser viewer o editor' })

  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (!target) return res.status(404).json({ error: 'No existe un usuario con ese nombre' })
  if (target.id === req.user.id) return res.status(400).json({ error: 'No puedes compartir una mascota contigo mismo' })

  db.prepare(`
    INSERT INTO pet_shares (pet_id, user_id, role) VALUES (?, ?, ?)
    ON CONFLICT(pet_id, user_id) DO UPDATE SET role = excluded.role
  `).run(req.pet.id, target.id, role)
  res.status(201).json(listShares(req.pet.id))
})

// DELETE /api/pets/:id/shares/:userId — el dueño quita un acceso, o alguien deja de seguir la mascota
router.delete('/:id/shares/:userId', requireAccess('pet', 'viewer'), (req, res) => {
  const userId = Number(req.params.userId)
  if (req.access !== 'owner' && userId !== req.user.id) {
    return res.status(403).json({ error: 'Solo el dueño de la mascota puede hacer esto' })
  }
  const result = db.prepare('DELETE FROM pet_shares WHERE pet_id = ? AND user_id = ?').run(req.pet.id, userId)
  if (result.changes === 0) return res.status(404).json({ error: 'Ese usuario no tiene acceso a esta mascota' })
  res.json(req.access === 'owner' ? listShares(req.pet.id) : [])
})

module.exports = router
module.exports.SPECIES = SPECIES
