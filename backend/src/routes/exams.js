const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const db = require('../db')

function getExamValues(examId) {
  return db.prepare('SELECT * FROM exam_values WHERE exam_id = ?').all(examId)
}

// ── Router montado en /api/pets ───────────────────────────────────────────────
// Maneja: GET/POST /api/pets/:petId/exams
const petRouter = express.Router()

const pdfStorage = multer.diskStorage({
  destination: '/app/data/uploads/pdfs/',
  filename: (req, file, cb) => {
    cb(null, `exam-${req.params.petId}-${Date.now()}.pdf`)
  },
})
const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
})

petRouter.get('/:petId/exams', (req, res) => {
  try {
    const exams = db.prepare(
      'SELECT * FROM exams WHERE pet_id = ? ORDER BY exam_date DESC'
    ).all(req.params.petId)
    res.json(exams.map(e => ({ ...e, exam_values: getExamValues(e.id) })))
  } catch (err) {
    console.error('GET /pets/:petId/exams', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

petRouter.post('/:petId/exams', uploadPdf.single('pdf'), (req, res) => {
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

    const insert = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO exams (pet_id, checkup_id, exam_type, exam_date, lab_name, pdf_url, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.petId, checkup_id ?? null, exam_type, exam_date, lab_name ?? null, pdf_url, notes ?? null)

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

    const examId = insert()
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId)
    res.status(201).json({ ...exam, exam_values: getExamValues(examId) })
  } catch (err) {
    console.error('POST /pets/:petId/exams', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ── Router montado en /api/exams ──────────────────────────────────────────────
// Maneja: GET/PUT/DELETE /api/exams/:id y values anidados
const examRouter = express.Router()

examRouter.get('/:id', (req, res) => {
  try {
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id)
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado' })
    res.json({ ...exam, exam_values: getExamValues(exam.id) })
  } catch (err) {
    console.error('GET /exams/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

examRouter.put('/:id', (req, res) => {
  try {
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id)
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado' })

    const allowed = ['exam_type', 'exam_date', 'lab_name', 'checkup_id', 'notes']
    const fields = Object.keys(req.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

    const setClause = fields.map(f => `${f} = ?`).join(', ')
    db.prepare(`UPDATE exams SET ${setClause} WHERE id = ?`).run(...fields.map(f => req.body[f]), req.params.id)

    const updated = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id)
    res.json({ ...updated, exam_values: getExamValues(updated.id) })
  } catch (err) {
    console.error('PUT /exams/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

examRouter.delete('/:id', (req, res) => {
  try {
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id)
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado' })

    if (exam.pdf_url) {
      fs.unlink(`/app/data${exam.pdf_url}`, () => {})
    }
    db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id)
    res.json({ message: 'Examen eliminado' })
  } catch (err) {
    console.error('DELETE /exams/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

examRouter.post('/:id/values', (req, res) => {
  try {
    const exam = db.prepare('SELECT id FROM exams WHERE id = ?').get(req.params.id)
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado' })

    const values = Array.isArray(req.body) ? req.body : []
    if (values.length === 0) return res.status(400).json({ error: 'Se requiere un array de valores' })

    const insert = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO exam_values (exam_id, parameter_name, value, unit, reference_range, is_abnormal)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      return values.map(v => {
        const r = stmt.run(req.params.id, v.parameter_name, v.value, v.unit ?? null, v.reference_range ?? null, v.is_abnormal ? 1 : 0)
        return db.prepare('SELECT * FROM exam_values WHERE id = ?').get(r.lastInsertRowid)
      })
    })

    res.status(201).json(insert())
  } catch (err) {
    console.error('POST /exams/:id/values', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ── Router montado en /api/exam-values ───────────────────────────────────────
// Maneja: PUT/DELETE /api/exam-values/:id
const examValueRouter = express.Router()

examValueRouter.put('/:id', (req, res) => {
  try {
    const val = db.prepare('SELECT * FROM exam_values WHERE id = ?').get(req.params.id)
    if (!val) return res.status(404).json({ error: 'Valor no encontrado' })

    const allowed = ['parameter_name', 'value', 'unit', 'reference_range', 'is_abnormal']
    const fields = Object.keys(req.body).filter(k => allowed.includes(k))
    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

    const setClause = fields.map(f => `${f} = ?`).join(', ')
    db.prepare(`UPDATE exam_values SET ${setClause} WHERE id = ?`).run(...fields.map(f => req.body[f]), req.params.id)

    res.json(db.prepare('SELECT * FROM exam_values WHERE id = ?').get(req.params.id))
  } catch (err) {
    console.error('PUT /exam-values/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

examValueRouter.delete('/:id', (req, res) => {
  try {
    const val = db.prepare('SELECT * FROM exam_values WHERE id = ?').get(req.params.id)
    if (!val) return res.status(404).json({ error: 'Valor no encontrado' })
    db.prepare('DELETE FROM exam_values WHERE id = ?').run(req.params.id)
    res.json({ message: 'Valor eliminado' })
  } catch (err) {
    console.error('DELETE /exam-values/:id', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

module.exports = { petRouter, examRouter, examValueRouter }
