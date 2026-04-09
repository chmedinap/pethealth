const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const db = require('../db')

const router = express.Router()

const pdfStorage = multer.diskStorage({
  destination: '/app/data/uploads/pdfs/',
  filename: (req, file, cb) => {
    cb(null, `exam-${req.params.id}-${Date.now()}.pdf`)
  },
})
const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf')
  },
})

function getExamValues(examId) {
  return db.prepare('SELECT * FROM exam_values WHERE exam_id = ?').all(examId)
}

// GET /api/pets/:id/exams
router.get('/pets/:id/exams', (req, res) => {
  try {
    const exams = db.prepare(`
      SELECT * FROM exams WHERE pet_id = ? ORDER BY exam_date DESC
    `).all(req.params.id)

    res.json(exams.map(e => ({ ...e, values: getExamValues(e.id) })))
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/pets/:id/exams
router.post('/pets/:id/exams', uploadPdf.single('pdf'), (req, res) => {
  try {
    const { exam_type, exam_date, lab_name, checkup_id, notes } = req.body
    if (!exam_type || !exam_date) {
      return res.status(400).json({ error: 'exam_type y exam_date son requeridos' })
    }

    let values = []
    if (req.body.values) {
      try { values = JSON.parse(req.body.values) } catch { values = [] }
    }

    const pdf_url = req.file ? `/uploads/pdfs/${req.file.filename}` : null

    const insertExam = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO exams (pet_id, checkup_id, exam_type, exam_date, lab_name, pdf_url, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.id, checkup_id ?? null, exam_type, exam_date, lab_name ?? null, pdf_url, notes ?? null)

      const examId = result.lastInsertRowid

      if (Array.isArray(values) && values.length > 0) {
        const insertVal = db.prepare(`
          INSERT INTO exam_values (exam_id, parameter_name, value, unit, reference_range, is_abnormal)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        for (const v of values) {
          insertVal.run(examId, v.parameter_name, v.value, v.unit ?? null, v.reference_range ?? null, v.is_abnormal ? 1 : 0)
        }
      }

      return examId
    })

    const examId = insertExam()
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId)
    res.status(201).json({ ...exam, values: getExamValues(examId) })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /api/exams/:id
router.get('/:id', (req, res) => {
  try {
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id)
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado' })
    res.json({ ...exam, values: getExamValues(exam.id) })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/exams/:id
router.put('/:id', (req, res) => {
  try {
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id)
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado' })

    const allowed = ['exam_type', 'exam_date', 'lab_name', 'checkup_id', 'notes']
    const fields = Object.keys(req.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => req.body[f])
    db.prepare(`UPDATE exams SET ${setClause} WHERE id = ?`).run(...values, req.params.id)

    const updated = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id)
    res.json({ ...updated, values: getExamValues(updated.id) })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/exams/:id
router.delete('/:id', (req, res) => {
  try {
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id)
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado' })

    if (exam.pdf_url) {
      const filePath = `/app/data${exam.pdf_url}`
      fs.unlink(filePath, () => {})
    }

    db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id)
    res.json({ message: 'Examen eliminado' })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/exams/:id/values
router.post('/:id/values', (req, res) => {
  try {
    const exam = db.prepare('SELECT id FROM exams WHERE id = ?').get(req.params.id)
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado' })

    const values = Array.isArray(req.body) ? req.body : []
    if (values.length === 0) return res.status(400).json({ error: 'Se requiere un array de valores' })

    const insertValues = db.transaction(() => {
      const insertVal = db.prepare(`
        INSERT INTO exam_values (exam_id, parameter_name, value, unit, reference_range, is_abnormal)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      const ids = []
      for (const v of values) {
        const result = insertVal.run(req.params.id, v.parameter_name, v.value, v.unit ?? null, v.reference_range ?? null, v.is_abnormal ? 1 : 0)
        ids.push(result.lastInsertRowid)
      }
      return ids
    })

    const ids = insertValues()
    const created = ids.map(id => db.prepare('SELECT * FROM exam_values WHERE id = ?').get(id))
    res.status(201).json(created)
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /api/exam-values/:valueId
router.put('/exam-values/:valueId', (req, res) => {
  try {
    const val = db.prepare('SELECT * FROM exam_values WHERE id = ?').get(req.params.valueId)
    if (!val) return res.status(404).json({ error: 'Valor no encontrado' })

    const allowed = ['parameter_name', 'value', 'unit', 'reference_range', 'is_abnormal']
    const fields = Object.keys(req.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => req.body[f])
    db.prepare(`UPDATE exam_values SET ${setClause} WHERE id = ?`).run(...values, req.params.valueId)

    res.json(db.prepare('SELECT * FROM exam_values WHERE id = ?').get(req.params.valueId))
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// DELETE /api/exam-values/:valueId
router.delete('/exam-values/:valueId', (req, res) => {
  try {
    const val = db.prepare('SELECT * FROM exam_values WHERE id = ?').get(req.params.valueId)
    if (!val) return res.status(404).json({ error: 'Valor no encontrado' })
    db.prepare('DELETE FROM exam_values WHERE id = ?').run(req.params.valueId)
    res.json({ message: 'Valor eliminado' })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = router
