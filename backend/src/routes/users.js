const crypto = require('crypto')
const express = require('express')
const bcrypt = require('bcryptjs')
const db = require('../db')
const { emailEnabled, sendDigest } = require('../notify')
const { isISODate } = require('../validate')
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LANGS = ['es', 'en']

function profile(user) {
  return {
    ...publicUser(user),
    created_at: user.created_at,
    email: user.email,
    notifyEmail: !!user.notify_email,
    lang: user.lang,
    calendarToken: user.calendar_token,
    emailEnabled: emailEnabled(),
  }
}

const loadUser = id => db.prepare('SELECT * FROM users WHERE id = ?').get(id)

// GET /api/users/me
router.get('/me', (req, res) => {
  res.json(profile(loadUser(req.user.id)))
})

// PUT /api/users/me { email, notify_email, currency, lang } — preferencias
router.put('/me', (req, res) => {
  const updates = {}
  const body = req.body
  if ('email' in body) {
    const email = String(body.email ?? '').trim()
    if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Correo inválido' })
    updates.email = email || null
  }
  if ('notify_email' in body) updates.notify_email = body.notify_email ? 1 : 0
  if ('currency' in body) {
    const currency = String(body.currency || '').toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency)) return res.status(400).json({ error: 'currency debe ser un código ISO de 3 letras' })
    updates.currency = currency
  }
  if ('lang' in body) {
    if (!LANGS.includes(body.lang)) return res.status(400).json({ error: 'lang debe ser es o en' })
    updates.lang = body.lang
  }
  const fields = Object.keys(updates)
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

  const next = { ...loadUser(req.user.id), ...updates }
  if (next.notify_email && !next.email) return res.status(400).json({ error: 'Indica un correo para recibir recordatorios' })

  db.prepare(`UPDATE users SET ${fields.map(f => `${f} = @${f}`).join(', ')} WHERE id = @id`).run({ ...updates, id: req.user.id })
  res.json(profile(loadUser(req.user.id)))
})

// POST /api/users/me/calendar-token — crea (o cambia) la URL privada del calendario.
// La anterior deja de funcionar.
router.post('/me/calendar-token', (req, res) => {
  const token = crypto.randomBytes(24).toString('hex')
  db.prepare('UPDATE users SET calendar_token = ? WHERE id = ?').run(token, req.user.id)
  res.json(profile(loadUser(req.user.id)))
})

// DELETE /api/users/me/calendar-token — desactiva el feed
router.delete('/me/calendar-token', (req, res) => {
  db.prepare('UPDATE users SET calendar_token = NULL WHERE id = ?').run(req.user.id)
  res.json(profile(loadUser(req.user.id)))
})

// POST /api/users/me/test-email — envía el resumen ahora, haya o no algo que avisar
router.post('/me/test-email', async (req, res) => {
  const user = loadUser(req.user.id)
  if (!emailEnabled()) return res.status(400).json({ error: 'El servidor no tiene el correo configurado' })
  if (!user.email) return res.status(400).json({ error: 'Primero guarda un correo' })
  try {
    // `today` lo envía el navegador para usar la fecha local del usuario
    await sendDigest(user, isISODate(req.body?.today) ? req.body.today : undefined, { force: true })
    res.json({ message: 'Correo enviado' })
  } catch (err) {
    console.error('[ERROR] test-email:', err.message)
    res.status(502).json({ error: 'No se pudo enviar el correo. Revisa la configuración SMTP del servidor.' })
  }
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
