require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')

const db = require('./db')
const authRouter = require('./routes/auth')
const petsRouter = require('./routes/pets')
const checkupsRouter = require('./routes/checkups')
const examsRouter = require('./routes/exams')
const authMiddleware = require('./middleware/auth')

const app = express()

fs.mkdirSync('/app/data/uploads/photos', { recursive: true })
fs.mkdirSync('/app/data/uploads/pdfs', { recursive: true })

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('/app/data/uploads'))

app.use('/api/auth', authRouter)
app.use('/api/pets', authMiddleware, petsRouter)
app.use('/api/checkups', authMiddleware, checkupsRouter)
app.use('/api/medications', authMiddleware, checkupsRouter)
app.use('/api/exams', authMiddleware, examsRouter)
app.use('/api/exam-values', authMiddleware, examsRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`)
})
