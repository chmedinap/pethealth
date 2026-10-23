const path = require('path')

// En Docker: /app/src → /app/data. En local: backend/src → backend/data.
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../data'))
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET no está configurado. Genera uno con: openssl rand -hex 32')
  process.exit(1)
}

module.exports = {
  DATA_DIR,
  UPLOADS_DIR,
  DB_PATH: path.join(DATA_DIR, 'pethealth.db'),
  JWT_SECRET,
  JWT_EXPIRES_IN: '7d',
  SESSION_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION === 'true',
}
