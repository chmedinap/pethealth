const jwt = require('jsonwebtoken')
const db = require('../db')
const { JWT_SECRET } = require('../config')
const { SESSION_COOKIE } = require('../session')

// Rutas permitidas mientras el usuario tiene pendiente cambiar la contraseña
const PASSWORD_CHANGE_ALLOWED = new Set(['/api/users/me', '/api/users/me/password', '/api/auth/refresh'])

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
    const user = db.prepare(
      'SELECT id, username, must_change_password, token_version FROM users WHERE id = ?'
    ).get(payload.id)
    // Usuario eliminado, o token emitido antes de revocar las sesiones
    if (!user || (payload.tv || 0) !== user.token_version) return null
    return user
  } catch {
    return null
  }
}

function bearerToken(req) {
  const header = req.headers['authorization']
  return header && header.startsWith('Bearer ') ? header.slice(7) : null
}

// API: solo header Authorization. No se acepta la cookie aquí, así las
// peticiones que modifican datos no son vulnerables a CSRF.
function authMiddleware(req, res, next) {
  const token = bearerToken(req)
  const user = token && verifyToken(token)
  if (!user) return res.status(401).json({ error: 'Token inválido o expirado' })

  const path = req.originalUrl.split('?')[0]
  if (user.must_change_password && !PASSWORD_CHANGE_ALLOWED.has(path)) {
    return res.status(403).json({ error: 'Debes cambiar tu contraseña antes de continuar', code: 'PASSWORD_CHANGE_REQUIRED' })
  }

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
