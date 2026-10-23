const express = require('express')
const db = require('../db')
const { getOwnedAttachment } = require('../access')
const { removeFile } = require('../files')

const router = express.Router()

// DELETE /api/attachments/:id
router.delete('/:id', (req, res) => {
  const att = getOwnedAttachment(req.params.id, req.user.id)
  if (!att) return res.status(404).json({ error: 'Archivo no encontrado' })

  db.prepare('DELETE FROM attachments WHERE id = ?').run(att.id)
  removeFile(att.file_url)
  res.json({ message: 'Archivo eliminado' })
})

module.exports = router
