const jwt = require('jsonwebtoken')
const db = require('../db')
const { JWT_SECRET } = require('../config')

const SESSION_COOKIE = 'ph_session'

function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    // El usuario podría haber sido eliminado después de emitir el token
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(payload.id)
    return user || null
  } catch {
    return null
  }
}

function bearerToken(req) {
  const header = req.headers['authorization']
  return header && header.startsWith('Bearer ') ? header.slice(7) : null
}

function unauthorized(res) {
  res.status(401).json({ error: 'Token inválido o expirado' })
}

// API: solo header Authorization. No se acepta la cookie aquí, así las
// peticiones que modifican datos no son vulnerables a CSRF.
function authMiddleware(req, res, next) {
  const token = bearerToken(req)
  const user = token && verifyToken(token)
  if (!user) return unauthorized(res)
  req.user = user
  next()
}

// Archivos (/uploads): las etiquetas <img> y los enlaces no envían headers,
// así que aquí también se acepta la cookie de sesión httpOnly.
function fileAuthMiddleware(req, res, next) {
  const token = bearerToken(req) || parseCookies(req.headers.cookie)[SESSION_COOKIE]
  const user = token && verifyToken(token)
  if (!user) return res.status(401).end()
  req.user = user
  next()
}

module.exports = authMiddleware
module.exports.authMiddleware = authMiddleware
module.exports.fileAuthMiddleware = fileAuthMiddleware
module.exports.SESSION_COOKIE = SESSION_COOKIE
