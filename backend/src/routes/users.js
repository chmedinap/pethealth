const express = require('express')
const bcrypt = require('bcryptjs')
const db = require('../db')
const { MIN_PASSWORD } = require('./auth')
const { issueSession, publicUser } = require('../session')

const router = express.Router()

// Invalida todos los tokens emitidos hasta ahora y devuelve una sesión nueva
// para quien hizo la petición (así no se cierra su propia sesión).
function revokeOtherSessions(req, res) {
  db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(req.user.id)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  return issueSession(req, res, user)
}

// GET /api/users/me
router.get('/me', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ ...publicUser(user), created_at: user.created_at })
})

// PUT /api/users/me/password — cambia la contraseña y cierra las demás sesiones
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
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'La nueva contraseña debe ser distinta de la actual' })
  }

  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .run(bcrypt.hashSync(newPassword, 10), req.user.id)
  res.json({ message: 'Contraseña actualizada', ...revokeOtherSessions(req, res) })
})

// POST /api/users/me/sessions/revoke — "cerrar sesión en los demás dispositivos"
router.post('/me/sessions/revoke', (req, res) => {
  res.json({ message: 'Sesiones cerradas', ...revokeOtherSessions(req, res) })
})

module.exports = router
