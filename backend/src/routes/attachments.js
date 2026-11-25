const fs = require('fs')
const express = require('express')
const db = require('../db')
const { requireAccess } = require('../access')
const { uploadAttachment, removeFile } = require('../files')

// Adjuntos de consultas y exámenes. La importación de ZIP usa el mismo límite.
const MAX_ATTACHMENTS = 3

function getAttachments(entityType, entityId) {
  return db.prepare(
    'SELECT * FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY created_at ASC'
  ).all(entityType, entityId)
}

// GET y POST /:id/attachments en el router de `entityType` ('checkup' | 'exam').
// requireAccess deja el registro en req[entityType].
function attachmentRoutes(router, entityType, label) {
  router.get('/:id/attachments', requireAccess(entityType, 'viewer'), (req, res) => {
    res.json(getAttachments(entityType, req[entityType].id))
  })

  const full = req => db.prepare('SELECT COUNT(*) AS cnt FROM attachments WHERE entity_type = ? AND entity_id = ?')
    .get(entityType, req[entityType].id).cnt >= MAX_ATTACHMENTS
  const limitError = { error: `Máximo ${MAX_ATTACHMENTS} archivos por ${label}` }

  // Rechaza antes de escribir el archivo si ya se alcanzó el máximo
  function checkLimit(req, res, next) {
    if (full(req)) return res.status(400).json(limitError)
    next()
  }

  router.post('/:id/attachments', requireAccess(entityType, 'editor'), checkLimit, uploadAttachment.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })
    // Se cuenta otra vez: otra subida simultánea pudo pasar checkLimit mientras este archivo se escribía
    if (full(req)) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json(limitError)
    }

    const file_url = `/uploads/attachments/${req.file.filename}`
    const file_type = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image'
    const result = db.prepare(`
      INSERT INTO attachments (entity_type, entity_id, file_url, file_name, file_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(entityType, req[entityType].id, file_url, req.file.originalname, file_type)

    res.status(201).json(db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid))
  })
}

const router = express.Router()

// DELETE /api/attachments/:id
router.delete('/:id', requireAccess('attachment', 'editor'), (req, res) => {
  const att = req.attachment
  db.prepare('DELETE FROM attachments WHERE id = ?').run(att.id)
  removeFile(att.file_url)
  res.json({ message: 'Archivo eliminado' })
})

module.exports = router
module.exports.MAX_ATTACHMENTS = MAX_ATTACHMENTS
module.exports.getAttachments = getAttachments
module.exports.attachmentRoutes = attachmentRoutes
