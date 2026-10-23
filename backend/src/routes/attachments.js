const express = require('express')
const db = require('../db')
const { requireAccess } = require('../access')
const { removeFile } = require('../files')

const router = express.Router()

// DELETE /api/attachments/:id
router.delete('/:id', requireAccess('attachment', 'editor'), (req, res) => {
  const att = req.attachment
  db.prepare('DELETE FROM attachments WHERE id = ?').run(att.id)
  removeFile(att.file_url)
  res.json({ message: 'Archivo eliminado' })
})

module.exports = router
