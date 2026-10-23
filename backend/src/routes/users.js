const express = require('express')
const bcrypt = require('bcryptjs')
const db = require('../db')
const { MIN_PASSWORD } = require('./auth')

const router = express.Router()

// GET /api/users/me
router.get('/me', (req, res) => {
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(req.user.id)
  res.json(user)
})

// PUT /api/users/me/password
router.put('/me/password', (req, res) => {
  const currentPassword = String(req.body.current_password || '')
  const newPassword = String(req.body.new_password || '')

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'La contraseña actual es incorrecta' })
  }
  if (newPassword.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `El password debe tener al menos ${MIN_PASSWORD} caracteres` })
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id)
  res.json({ message: 'Contraseña actualizada' })
})

module.exports = router
