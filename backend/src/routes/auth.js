const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db')
const { JWT_SECRET, JWT_EXPIRES_IN, SESSION_MAX_AGE_MS, ALLOW_REGISTRATION } = require('../config')
const { authMiddleware, SESSION_COOKIE } = require('../middleware/auth')

const router = express.Router()

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/
const MIN_PASSWORD = 8

function issueSession(req, res, user) {
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/uploads',
  })
  return { token, user: { id: user.id, username: user.username } }
}

// GET /api/auth/config — opciones públicas que necesita la pantalla de login
router.get('/config', (req, res) => {
  res.json({ allowRegistration: ALLOW_REGISTRATION })
})

router.post('/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'username y password son requeridos' })
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).trim())
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  res.json(issueSession(req, res, user))
})

router.post('/register', (req, res) => {
  if (!ALLOW_REGISTRATION) {
    return res.status(403).json({ error: 'El registro está deshabilitado' })
  }

  const username = String(req.body.username || '').trim()
  const password = String(req.body.password || '')
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'El usuario debe tener 3–32 caracteres (letras, números, _ . -)' })
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `El password debe tener al menos ${MIN_PASSWORD} caracteres` })
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  try {
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash)
    res.status(201).json(issueSession(req, res, { id: result.lastInsertRowid, username }))
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'El usuario ya existe' })
    }
    throw err
  }
})

// POST /api/auth/refresh — renueva el token y la cookie de archivos
router.post('/refresh', authMiddleware, (req, res) => {
  res.json(issueSession(req, res, req.user))
})

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/uploads' })
  res.json({ message: 'Sesión cerrada' })
})

module.exports = router
module.exports.MIN_PASSWORD = MIN_PASSWORD
