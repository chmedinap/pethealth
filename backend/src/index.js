require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const config = require('./config')
require('./db')
const authRouter = require('./routes/auth')
const usersRouter = require('./routes/users')
const petsRouter = require('./routes/pets')
const { petRouter: checkupPetRouter, checkupRouter, medicationRouter } = require('./routes/checkups')
const { petRouter: examPetRouter, examRouter, examValueRouter } = require('./routes/exams')
const attachmentsRouter = require('./routes/attachments')
const { authMiddleware, fileAuthMiddleware } = require('./middleware/auth')
const { userOwnsFile } = require('./access')
const { UploadError, resolveUploadPath } = require('./files')

const app = express()

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO'
    const ip = req.ip || req.socket.remoteAddress
    console.log(`[${level}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms) [${ip}]`)
  })
  next()
})

// ── Middlewares globales ──────────────────────────────────────────────────────
// Activar solo si hay un proxy/nginx delante (TRUST_PROXY=true)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1)
  console.log('   Trust proxy: activado')
}

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Referrer-Policy', 'same-origin')
  next()
})

// El frontend se sirve desde el mismo origen; CORS solo hace falta en desarrollo
if (process.env.NODE_ENV !== 'production') app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ── Archivos subidos por usuarios (requiere sesión y ser dueño) ──────────────
app.get('/uploads/*', fileAuthMiddleware, (req, res) => {
  const fileUrl = req.path
  const abs = resolveUploadPath(fileUrl)
  if (!abs || !userOwnsFile(fileUrl, req.user.id) || !fs.existsSync(abs)) {
    return res.status(404).end()
  }
  res.set('Cache-Control', 'private, max-age=3600')
  res.sendFile(abs)
})

// ── Rutas de API ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/users', authMiddleware, usersRouter)

// /api/pets — mascotas + sub-recursos anidados (checkups y exams por mascota)
app.use('/api/pets', authMiddleware, petsRouter)
app.use('/api/pets', authMiddleware, checkupPetRouter)   // GET/POST /api/pets/:petId/checkups
app.use('/api/pets', authMiddleware, examPetRouter)      // GET/POST /api/pets/:petId/exams

// /api/checkups — operaciones sobre checkups individuales
app.use('/api/checkups', authMiddleware, checkupRouter)

// /api/medications — operaciones sobre medicamentos individuales
app.use('/api/medications', authMiddleware, medicationRouter)

// /api/exams — operaciones sobre exámenes individuales
app.use('/api/exams', authMiddleware, examRouter)

// /api/exam-values — operaciones sobre valores individuales
app.use('/api/exam-values', authMiddleware, examValueRouter)

// /api/attachments — eliminar archivos adjuntos
app.use('/api/attachments', authMiddleware, attachmentsRouter)

// Rutas de API inexistentes → JSON, no el index.html de la SPA
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))

// ── Frontend compilado (SPA) ──────────────────────────────────────────────────
const publicDir = path.join(__dirname, '../public')
app.use(express.static(publicDir))

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

// ── Error handler global ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Si multer ya escribió el archivo antes del error, se elimina
  if (req.file) fs.unlink(req.file.path, () => {})

  if (err instanceof UploadError) return res.status(err.status).json({ error: err.message })
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo es demasiado grande' : 'Archivo inválido'
    return res.status(status).json({ error: message })
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' })
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Petición demasiado grande' })

  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message)
  console.error(err.stack)
  res.status(500).json({ error: 'Error interno del servidor' })
})

// ── Inicio ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`)
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   Datos en: ${config.DATA_DIR}`)
  console.log(`   Registro público: ${config.ALLOW_REGISTRATION ? 'habilitado' : 'deshabilitado'}`)
})
