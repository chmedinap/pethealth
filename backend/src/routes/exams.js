const express = require('express')
const db = require('../db')
const { requireAccess } = require('../access')
const { clean, isISODate } = require('../validate')
const { uploadPdf, uploadAttachment, removeFile, removeFiles } = require('../files')

const MAX_ATTACHMENTS = 3

// ── Helpers ───────────────────────────────────────────────────────────────────
function getExamValues(examId) {
  return db.prepare('SELECT * FROM exam_values WHERE exam_id = ?').all(examId)
}

function getAttachments(examId) {
  return db.prepare(
    "SELECT * FROM attachments WHERE entity_type = 'exam' AND entity_id = ? ORDER BY created_at ASC"
  ).all(examId)
}

function fullExam(exam) {
  return {
    ...exam,
    exam_values: getExamValues(exam.id),
    attachments: getAttachments(exam.id),
  }
}

// checkup_id es opcional, pero si viene debe ser un checkup de la misma mascota
function checkupBelongsToPet(checkupId, petId) {
  if (checkupId == null || checkupId === '') return true
  return !!db.prepare('SELECT 1 FROM checkups WHERE id = ? AND pet_id = ?').get(checkupId, petId)
}

function validateValue(v) {
  if (!v || !String(v.parameter_name || '').trim()) return 'parameter_name es requerido en cada valor'
  if (v.value == null || !String(v.value).trim()) return 'value es requerido en cada valor'
  return null
}

// ── Router montado en /api/pets ───────────────────────────────────────────────
const petRouter = express.Router()

petRouter.get('/:petId/exams', requireAccess('pet', 'viewer', 'petId'), (req, res) => {
  const exams = db.prepare(
    'SELECT * FROM exams WHERE pet_id = ? ORDER BY exam_date DESC'
  ).all(req.pet.id)
  res.json(exams.map(fullExam))
})

// requireAccess va antes de multer: no se escribe ningún PDF sin permiso
petRouter.post('/:petId/exams', requireAccess('pet', 'editor', 'petId'), uploadPdf.single('pdf'), (req, res) => {
  const pdf_url = req.file ? `/uploads/pdfs/${req.file.filename}` : null
  const reject = (error) => {
    if (pdf_url) removeFile(pdf_url)
    res.status(400).json({ error })
  }

  const { exam_type, exam_date, lab_name, checkup_id, notes } = req.body
  if (!exam_type || !exam_date) return reject('exam_type y exam_date son requeridos')
  if (!isISODate(exam_date)) return reject('exam_date debe tener formato YYYY-MM-DD')
  if (!checkupBelongsToPet(checkup_id, req.pet.id)) return reject('checkup_id no pertenece a esta mascota')

  let values = []
  if (req.body.values) {
    try { values = JSON.parse(req.body.values) } catch { return reject('values debe ser JSON válido') }
  }
  if (!Array.isArray(values)) return reject('values debe ser un array')
  for (const v of values) {
    const error = validateValue(v)
    if (error) return reject(error)
  }

  const insert = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO exams (pet_id, checkup_id, exam_type, exam_date, lab_name, pdf_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.pet.id, clean(checkup_id), exam_type, exam_date, clean(lab_name), pdf_url, clean(notes))

    const examId = result.lastInsertRowid
    const insertVal = db.prepare(`
      INSERT INTO exam_values (exam_id, parameter_name, value, unit, reference_range, is_abnormal)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const v of values) {
      insertVal.run(examId, v.parameter_name, String(v.value), clean(v.unit), clean(v.reference_range), v.is_abnormal ? 1 : 0)
    }
    return examId
  })

  const examId = insert()
  res.status(201).json(fullExam(db.prepare('SELECT * FROM exams WHERE id = ?').get(examId)))
})

// ── Router montado en /api/exams ──────────────────────────────────────────────
const examRouter = express.Router()

examRouter.get('/:id', requireAccess('exam', 'viewer'), (req, res) => {
  res.json(fullExam(req.exam))
})

examRouter.put('/:id', requireAccess('exam', 'editor'), (req, res) => {
  const allowed = ['exam_type', 'exam_date', 'lab_name', 'checkup_id', 'notes']
  const fields = Object.keys(req.body).filter(k => allowed.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })
  for (const required of ['exam_type', 'exam_date']) {
    if (fields.includes(required) && !String(req.body[required] || '').trim()) {
      return res.status(400).json({ error: `${required} no puede estar vacío` })
    }
  }
  if (fields.includes('exam_date') && !isISODate(req.body.exam_date)) {
    return res.status(400).json({ error: 'exam_date debe tener formato YYYY-MM-DD' })
  }
  if (fields.includes('checkup_id') && !checkupBelongsToPet(req.body.checkup_id, req.exam.pet_id)) {
    return res.status(400).json({ error: 'checkup_id no pertenece a esta mascota' })
  }

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  db.prepare(`UPDATE exams SET ${setClause} WHERE id = ?`).run(...fields.map(f => clean(req.body[f])), req.exam.id)

  res.json(fullExam(db.prepare('SELECT * FROM exams WHERE id = ?').get(req.exam.id)))
})

examRouter.delete('/:id', requireAccess('exam', 'editor'), (req, res) => {
  const files = getAttachments(req.exam.id).map(a => a.file_url)
  if (req.exam.pdf_url) files.push(req.exam.pdf_url)
  // El trigger trg_exam_attachments borra las filas de attachments
  db.prepare('DELETE FROM exams WHERE id = ?').run(req.exam.id)
  removeFiles(files)
  res.json({ message: 'Examen eliminado' })
})

examRouter.post('/:id/values', requireAccess('exam', 'editor'), (req, res) => {
  const values = Array.isArray(req.body) ? req.body : []
  if (values.length === 0) return res.status(400).json({ error: 'Se requiere un array de valores' })
  for (const v of values) {
    const error = validateValue(v)
    if (error) return res.status(400).json({ error })
  }

  const insert = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO exam_values (exam_id, parameter_name, value, unit, reference_range, is_abnormal)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    return values.map(v => {
      const r = stmt.run(req.exam.id, v.parameter_name, String(v.value), clean(v.unit), clean(v.reference_range), v.is_abnormal ? 1 : 0)
      return db.prepare('SELECT * FROM exam_values WHERE id = ?').get(r.lastInsertRowid)
    })
  })

  res.status(201).json(insert())
})

// GET /api/exams/:id/attachments
examRouter.get('/:id/attachments', requireAccess('exam', 'viewer'), (req, res) => {
  res.json(getAttachments(req.exam.id))
})

// Rechaza antes de escribir el archivo si ya se alcanzó el máximo
function checkAttachmentLimit(req, res, next) {
  const { cnt } = db.prepare(
    "SELECT COUNT(*) as cnt FROM attachments WHERE entity_type = 'exam' AND entity_id = ?"
  ).get(req.exam.id)
  if (cnt >= MAX_ATTACHMENTS) return res.status(400).json({ error: `Máximo ${MAX_ATTACHMENTS} archivos por examen` })
  next()
}

// POST /api/exams/:id/attachments
examRouter.post('/:id/attachments', requireAccess('exam', 'editor'), checkAttachmentLimit, uploadAttachment.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

  const file_url = `/uploads/attachments/${req.file.filename}`
  const file_type = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image'

  const result = db.prepare(`
    INSERT INTO attachments (entity_type, entity_id, file_url, file_name, file_type)
    VALUES ('exam', ?, ?, ?, ?)
  `).run(req.exam.id, file_url, req.file.originalname, file_type)

  res.status(201).json(db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid))
})

// ── Router montado en /api/exam-values ───────────────────────────────────────
const examValueRouter = express.Router()

examValueRouter.put('/:id', requireAccess('examValue', 'editor'), (req, res) => {
  const allowed = ['parameter_name', 'value', 'unit', 'reference_range', 'is_abnormal']
  const fields = Object.keys(req.body).filter(k => allowed.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })

  const error = validateValue({ ...req.examValue, ...req.body })
  if (error) return res.status(400).json({ error })

  const normalize = (f) => f === 'is_abnormal' ? (req.body.is_abnormal ? 1 : 0) : clean(req.body[f])
  const setClause = fields.map(f => `${f} = ?`).join(', ')
  db.prepare(`UPDATE exam_values SET ${setClause} WHERE id = ?`).run(...fields.map(normalize), req.examValue.id)

  res.json(db.prepare('SELECT * FROM exam_values WHERE id = ?').get(req.examValue.id))
})

examValueRouter.delete('/:id', requireAccess('examValue', 'editor'), (req, res) => {
  db.prepare('DELETE FROM exam_values WHERE id = ?').run(req.examValue.id)
  res.json({ message: 'Valor eliminado' })
})

module.exports = { petRouter, examRouter, examValueRouter }
