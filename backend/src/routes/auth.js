const express = require('express')
const bcrypt = require('bcryptjs')
const rateLimit = require('express-rate-limit')
const db = require('../db')
const { ALLOW_REGISTRATION, LOGIN_RATE_LIMIT } = require('../config')
const { authMiddleware } = require('../middleware/auth')
const { issueSession, clearSession } = require('../session')

const router = express.Router()

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/
const MIN_PASSWORD = 8

// Frena ataques de fuerza bruta: solo cuentan los intentos fallidos, por IP.
// Detrás de un proxy hace falta TRUST_PROXY=true para que la IP sea la real.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LOGIN_RATE_LIMIT,
  skip: () => LOGIN_RATE_LIMIT === 0,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
})

// GET /api/auth/config — opciones públicas que necesita la pantalla de login
router.get('/config', (req, res) => {
  res.json({ allowRegistration: ALLOW_REGISTRATION })
})

router.post('/login', authLimiter, (req, res) => {
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

router.post('/register', authLimiter, (req, res) => {
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
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(issueSession(req, res, user))
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
  clearSession(res)
  res.json({ message: 'Sesión cerrada' })
})

module.exports = router
module.exports.MIN_PASSWORD = MIN_PASSWORD
