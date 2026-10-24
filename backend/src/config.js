const path = require('path')

// En Docker: /app/src → /app/data. En local: backend/src → backend/data.
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../data'))
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')

function intEnv(name, fallback) {
  const value = parseInt(process.env[name], 10)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

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
  // Intentos fallidos de login/registro permitidos por IP cada 15 minutos
  LOGIN_RATE_LIMIT: intEnv('LOGIN_RATE_LIMIT', 10),
  // Copias de seguridad de la base de datos (0 desactiva)
  BACKUP_DIR: path.join(DATA_DIR, 'backups'),
  BACKUP_INTERVAL_HOURS: intEnv('BACKUP_INTERVAL_HOURS', 24),
  BACKUP_KEEP: intEnv('BACKUP_KEEP', 7),
  // Correo de recordatorios. Sin SMTP_HOST no se envía nada.
  SMTP: {
    host: process.env.SMTP_HOST || '',
    port: intEnv('SMTP_PORT', 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },
  // Hora local (0–23) a partir de la cual se envía el resumen diario
  NOTIFY_HOUR: Math.min(intEnv('NOTIFY_HOUR', 8), 23),
  // URL pública de la app, para los enlaces de los correos (opcional)
  APP_URL: (process.env.APP_URL || '').replace(/\/+$/, ''),
}
