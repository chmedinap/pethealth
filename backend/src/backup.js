// `npm run backup` ejecuta este archivo directamente: .env debe cargarse antes que config
if (require.main === module) require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { BACKUP_DIR, BACKUP_INTERVAL_HOURS, BACKUP_KEEP } = require('./config')

const PREFIX = 'pethealth-'
const SUFFIX = '.db'
const CHECK_EVERY_MS = 60 * 60 * 1000

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return []
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(PREFIX) && f.endsWith(SUFFIX))
    .map(f => ({ file: path.join(BACKUP_DIR, f), mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    // El nombre lleva el timestamp: ordenar por nombre es más fiable que por mtime
    .sort((a, b) => b.file.localeCompare(a.file))
}

function timestamp() {
  // 2026-10-22T10:11:12.345Z → 20261022-101112-345
  return new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').replace('.', '-').slice(0, 19)
}

// Copia consistente con la API de backup en línea de SQLite: funciona con la
// base abierta y en modo WAL, a diferencia de copiar el archivo .db a mano.
// Los archivos subidos (uploads/) no cambian una vez escritos; respáldalos
// copiando la carpeta data/ completa.
async function runBackup() {
  const db = require('./db')
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const dest = path.join(BACKUP_DIR, `${PREFIX}${timestamp()}${SUFFIX}`)
  await db.backup(dest)

  for (const old of listBackups().slice(BACKUP_KEEP)) fs.unlinkSync(old.file)
  return dest
}

async function backupIfDue() {
  const latest = listBackups()[0]
  const ageHours = latest ? (Date.now() - latest.mtime) / 3600000 : Infinity
  if (ageHours < BACKUP_INTERVAL_HOURS) return
  try {
    const dest = await runBackup()
    console.log(`💾 Backup creado: ${path.basename(dest)}`)
  } catch (err) {
    console.error('❌ Error creando backup:', err.message)
  }
}

function startBackupSchedule() {
  if (BACKUP_INTERVAL_HOURS === 0 || BACKUP_KEEP === 0) {
    console.log('   Backups automáticos: desactivados')
    return
  }
  console.log(`   Backups automáticos: cada ${BACKUP_INTERVAL_HOURS} h, se guardan ${BACKUP_KEEP} en ${BACKUP_DIR}`)
  backupIfDue()
  setInterval(backupIfDue, CHECK_EVERY_MS).unref()
}

module.exports = { runBackup, listBackups, startBackupSchedule }

// `npm run backup` → copia manual inmediata
if (require.main === module) {
  runBackup()
    .then(dest => { console.log(`💾 Backup creado: ${dest}`); process.exit(0) })
    .catch(err => { console.error('❌', err.message); process.exit(1) })
}
