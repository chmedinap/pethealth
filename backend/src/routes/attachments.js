const express = require('express')
const fs = require('fs')
const db = require('../db')

const router = express.Router()

// DELETE /api/attachments/:id
router.delete('/:id', (req, res) => {
  try {
    const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id)
    if (!att) return res.status(404).json({ error: 'Archivo no encontrado' })

    if (att.file_url) {
      fs.unlink(`/app/data${att.file_url}`, () => {})
    }

    db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id)
    res.json({ message: 'Archivo eliminado' })
  } catch (err) {
    console.error('DELETE /attachments/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
