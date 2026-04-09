require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const db = require('./db')
const authRouter = require('./routes/auth')
const petsRouter = require('./routes/pets')
const { petRouter: checkupPetRouter, checkupRouter, medicationRouter } = require('./routes/checkups')
const { petRouter: examPetRouter, examRouter, examValueRouter } = require('./routes/exams')
const authMiddleware = require('./middleware/auth')

const app = express()

// ── Directorios de datos ──────────────────────────────────────────────────────
fs.mkdirSync('/app/data/uploads/photos', { recursive: true })
fs.mkdirSync('/app/data/uploads/pdfs', { recursive: true })

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO'
    console.log(`[${level}] ${req.method} ${req.url} → ${res.statusCode} (${ms}ms)`)
  })
  next()
})

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(cors())
app.use(express.json())

// ── Archivos subidos por usuarios ─────────────────────────────────────────────
app.use('/uploads', express.static('/app/data/uploads'))

// ── Rutas de API ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)

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

// ── Frontend compilado (SPA) ──────────────────────────────────────────────────
const publicDir = path.join(__dirname, '../public')
app.use(express.static(publicDir))

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

// ── Error handler global ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message)
  console.error(err.stack)
  res.status(500).json({ error: 'Error interno del servidor' })
})

// ── Inicio ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`)
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   JWT_SECRET configurado: ${!!process.env.JWT_SECRET}`)
})
