const jwt = require('jsonwebtoken')
const { JWT_SECRET, JWT_EXPIRES_IN, SESSION_MAX_AGE_MS } = require('./config')

const SESSION_COOKIE = 'ph_session'

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    mustChangePassword: !!user.must_change_password,
    currency: user.currency || 'USD',
  }
}

// Emite un JWT (para la API) y la cookie httpOnly (para /uploads).
// `tv` es la token_version del usuario: al incrementarla se invalidan
// todos los tokens emitidos antes (cambio de contraseña, "cerrar otras sesiones").
function issueSession(req, res, user) {
  const token = jwt.sign(
    { id: user.id, username: user.username, tv: user.token_version || 0 },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/uploads',
  })
  return { token, user: publicUser(user) }
}

function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/uploads' })
}

module.exports = { SESSION_COOKIE, issueSession, clearSession, publicUser }
