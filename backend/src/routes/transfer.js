const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')
const AdmZip = require('adm-zip')
const db = require('../db')
const { requireAccess } = require('../access')
const { UPLOADS_DIR } = require('../config')
const { resolveUploadPath, removeFiles } = require('../files')
const { isISODate, isBlank, isValidCost, cleanCost, todayISO } = require('../validate')
const { SPECIES } = require('./pets')
const { PARASITE_KINDS } = require('./parasites')
const { CONDITION_KINDS } = require('./conditions')

// Exportar / importar una mascota completa como ZIP: pet.json + files/…
// El formato es propio de PetHealth y sirve para migrar entre instalaciones
// o entregar el historial a otra persona.
const FORMAT = 'pethealth-pet'
const VERSION = 1
const MAX_ZIP_MB = 200
const MAX_ENTRIES = 2000
const MAX_UNCOMPRESSED = 1024 * 1024 * 1024
const MAX_ATTACHMENTS = 3

const router = express.Router()

// ── Exportar ──────────────────────────────────────────────────────────────────
function exportPet(petId) {
  // Cada archivo va a files/<nombre en disco>; el JSON guarda esa ruta
  const files = new Set()
  const ref = url => {
    if (!url) return null
    files.add(url)
    return `files/${path.basename(url)}`
  }
  const attachmentsOf = (type, id) => db.prepare(
    'SELECT file_url, file_name, file_type FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY created_at, id'
  ).all(type, id).map(a => ({ file: ref(a.file_url), file_name: a.file_name, file_type: a.file_type }))

  const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(petId)
  const data = {
    format: FORMAT,
    version: VERSION,
    exported_at: new Date().toISOString(),
    pet: {
      name: pet.name, species: pet.species, breed: pet.breed, birth_date: pet.birth_date,
      gender: pet.gender, weight_kg: pet.weight_kg, notes: pet.notes, photo: ref(pet.photo_url),
    },
    conditions: db.prepare('SELECT kind, name, since, notes FROM pet_conditions WHERE pet_id = ? ORDER BY id').all(petId),
    checkups: db.prepare('SELECT * FROM checkups WHERE pet_id = ? ORDER BY checkup_date, id').all(petId).map(c => ({
      ref: c.id,
      vet_name: c.vet_name, clinic_name: c.clinic_name, checkup_date: c.checkup_date, reason: c.reason,
      diagnosis: c.diagnosis, observations: c.observations, next_visit_date: c.next_visit_date, cost: c.cost,
      medications: db.prepare('SELECT * FROM medications WHERE checkup_id = ? ORDER BY id').all(c.id).map(m => ({
        name: m.name, concentration: m.concentration, frequency: m.frequency, duration_days: m.duration_days, notes: m.notes,
        doses: db.prepare('SELECT given_on, given_time FROM medication_doses WHERE medication_id = ? ORDER BY given_on, given_time').all(m.id),
      })),
      attachments: attachmentsOf('checkup', c.id),
    })),
    exams: db.prepare('SELECT * FROM exams WHERE pet_id = ? ORDER BY exam_date, id').all(petId).map(e => ({
      checkup_ref: e.checkup_id, exam_type: e.exam_type, exam_date: e.exam_date, lab_name: e.lab_name,
      notes: e.notes, cost: e.cost, pdf: ref(e.pdf_url),
      values: db.prepare('SELECT parameter_name, value, unit, reference_range, is_abnormal FROM exam_values WHERE exam_id = ? ORDER BY id').all(e.id),
      attachments: attachmentsOf('exam', e.id),
    })),
    vaccines: db.prepare('SELECT name, date_given, next_due_date, vet_name, batch_number, notes, cost FROM vaccines WHERE pet_id = ? ORDER BY date_given, id').all(petId),
    parasites: db.prepare('SELECT kind, product, date_given, next_due_date, cost, notes FROM parasite_treatments WHERE pet_id = ? ORDER BY date_given, id').all(petId),
    weights: db.prepare('SELECT measured_on, weight_kg, notes FROM weight_logs WHERE pet_id = ? ORDER BY measured_on, id').all(petId),
  }

  const zip = new AdmZip()
  zip.addFile('pet.json', Buffer.from(JSON.stringify(data, null, 2)))
  for (const url of files) {
    const abs = resolveUploadPath(url)
    if (abs && fs.existsSync(abs)) zip.addLocalFile(abs, 'files')
    else console.warn(`[WARN] Exportación: falta el archivo ${url}`)
  }
  return { zip: zip.toBuffer(), name: pet.name }
}

// GET /api/pets/:id/export — cualquiera que pueda ver la mascota puede exportarla
router.get('/:id/export', requireAccess('pet', 'viewer'), (req, res) => {
  const { zip, name } = exportPet(req.pet.id)
  const slug = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'mascota'
  const filename = `pethealth-${slug}-${todayISO()}.zip`
  res.set('Content-Type', 'application/zip')
  res.set('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(zip)
})

// ── Importar ──────────────────────────────────────────────────────────────────
class ImportError extends Error {}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ZIP_MB * 1024 * 1024, files: 1 } })

// El tipo real se deduce del contenido, no del nombre ni de lo que diga el JSON
function sniff(buf) {
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return { kind: 'pdf', ext: '.pdf' }
  if (buf.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return { kind: 'image', ext: '.png' }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: 'image', ext: '.jpg' }
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return { kind: 'image', ext: '.gif' }
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { kind: 'image', ext: '.webp' }
  return null
}

const text = v => (isBlank(v) ? null : String(v).trim())
const date = v => (isISODate(v) ? v : null)
const cost = v => (isValidCost(v) ? cleanCost(v) : null)
const list = v => (Array.isArray(v) ? v : [])
function required(value, what) {
  if (value == null) throw new ImportError(`Falta ${what}`)
  return value
}

function importPet(zip, userId) {
  const entries = zip.getEntries()
  if (entries.length > MAX_ENTRIES) throw new ImportError('El archivo tiene demasiadas entradas')
  if (entries.reduce((sum, e) => sum + e.header.size, 0) > MAX_UNCOMPRESSED) throw new ImportError('El archivo es demasiado grande')

  const manifest = zip.getEntry('pet.json')
  if (!manifest) throw new ImportError('Falta pet.json: no es una exportación de PetHealth')
  let data
  try { data = JSON.parse(manifest.getData().toString('utf8')) } catch { throw new ImportError('pet.json no es JSON válido') }
  if (data?.format !== FORMAT) throw new ImportError('No es una exportación de PetHealth')
  if (data.version !== VERSION) throw new ImportError(`Versión de exportación no soportada: ${data.version}`)

  // Archivos escritos en disco; se borran si la importación falla a mitad
  const written = []
  function saveFile(name, allowed, subdir) {
    if (typeof name !== 'string' || !/^files\/[A-Za-z0-9._-]+$/.test(name)) return null
    const entry = zip.getEntry(name)
    if (!entry || entry.isDirectory) return null
    const buf = entry.getData()
    const type = sniff(buf)
    if (!type || !allowed.includes(type.kind)) return null
    const filename = `${crypto.randomBytes(16).toString('hex')}${type.ext}`
    fs.writeFileSync(path.join(UPLOADS_DIR, subdir, filename), buf)
    const url = `/uploads/${subdir}/${filename}`
    written.push(url)
    return { url, kind: type.kind }
  }

  const p = data.pet || {}
  const insert = (table, row) => {
    const cols = Object.keys(row)
    return db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(c => '@' + c).join(', ')})`).run(row).lastInsertRowid
  }
  const addAttachments = (type, id, items) => {
    for (const a of list(items).slice(0, MAX_ATTACHMENTS)) {
      const file = saveFile(a?.file, ['pdf', 'image'], 'attachments')
      if (file) insert('attachments', { entity_type: type, entity_id: id, file_url: file.url, file_name: text(a.file_name) || path.basename(file.url), file_type: file.kind })
    }
  }

  try {
    return db.transaction(() => {
      const weights = list(data.weights).filter(w => date(w?.measured_on) && Number(w.weight_kg) > 0)
      const latestWeight = [...weights].sort((a, b) => a.measured_on.localeCompare(b.measured_on)).at(-1)
      const petId = insert('pets', {
        user_id: userId,
        name: required(text(p.name), 'el nombre de la mascota'),
        species: SPECIES.includes(p.species) ? p.species : 'other',
        breed: text(p.breed),
        birth_date: date(p.birth_date),
        gender: ['male', 'female'].includes(p.gender) ? p.gender : null,
        weight_kg: latestWeight ? Number(latestWeight.weight_kg) : (Number(p.weight_kg) > 0 ? Number(p.weight_kg) : null),
        notes: text(p.notes),
        photo_url: saveFile(p.photo, ['image'], 'photos')?.url ?? null,
      })

      for (const c of list(data.conditions)) {
        if (!CONDITION_KINDS.includes(c?.kind) || !text(c.name)) continue
        insert('pet_conditions', { pet_id: petId, kind: c.kind, name: text(c.name), since: date(c.since), notes: text(c.notes) })
      }

      const checkupIds = new Map()
      for (const c of list(data.checkups)) {
        const id = insert('checkups', {
          pet_id: petId,
          vet_name: text(c.vet_name) || '—',
          clinic_name: text(c.clinic_name),
          checkup_date: required(date(c.checkup_date), 'la fecha de una consulta'),
          reason: text(c.reason) || '—',
          diagnosis: text(c.diagnosis),
          observations: text(c.observations),
          next_visit_date: date(c.next_visit_date),
          cost: cost(c.cost),
        })
        if (c.ref != null) checkupIds.set(c.ref, id)
        for (const m of list(c.medications)) {
          if (!text(m?.name) || !text(m.frequency)) continue
          const medId = insert('medications', {
            checkup_id: id, name: text(m.name), concentration: text(m.concentration), frequency: text(m.frequency),
            duration_days: Number.isInteger(m.duration_days) && m.duration_days > 0 ? m.duration_days : null, notes: text(m.notes),
          })
          for (const d of list(m.doses)) {
            if (!date(d?.given_on)) continue
            insert('medication_doses', { medication_id: medId, given_on: d.given_on, given_time: /^\d{2}:\d{2}$/.test(d.given_time || '') ? d.given_time : null })
          }
        }
        addAttachments('checkup', id, c.attachments)
      }

      for (const e of list(data.exams)) {
        const id = insert('exams', {
          pet_id: petId,
          checkup_id: checkupIds.get(e.checkup_ref) ?? null,
          exam_type: text(e.exam_type) || '—',
          exam_date: required(date(e.exam_date), 'la fecha de un examen'),
          lab_name: text(e.lab_name),
          notes: text(e.notes),
          cost: cost(e.cost),
          pdf_url: saveFile(e.pdf, ['pdf'], 'pdfs')?.url ?? null,
        })
        for (const v of list(e.values)) {
          if (!text(v?.parameter_name) || v.value == null || !String(v.value).trim()) continue
          insert('exam_values', {
            exam_id: id, parameter_name: text(v.parameter_name), value: String(v.value).trim(),
            unit: text(v.unit), reference_range: text(v.reference_range), is_abnormal: v.is_abnormal ? 1 : 0,
          })
        }
        addAttachments('exam', id, e.attachments)
      }

      for (const v of list(data.vaccines)) {
        if (!text(v?.name) || !date(v.date_given)) continue
        const due = date(v.next_due_date)
        insert('vaccines', {
          pet_id: petId, name: text(v.name), date_given: v.date_given, next_due_date: due && due >= v.date_given ? due : null,
          vet_name: text(v.vet_name), batch_number: text(v.batch_number), notes: text(v.notes), cost: cost(v.cost),
        })
      }

      for (const t of list(data.parasites)) {
        if (!PARASITE_KINDS.includes(t?.kind) || !text(t.product) || !date(t.date_given)) continue
        const due = date(t.next_due_date)
        insert('parasite_treatments', {
          pet_id: petId, kind: t.kind, product: text(t.product), date_given: t.date_given,
          next_due_date: due && due >= t.date_given ? due : null, cost: cost(t.cost), notes: text(t.notes),
        })
      }

      // Una medición por día, como en el resto de la app
      const byDay = new Map(weights.map(w => [w.measured_on, w]))
      for (const w of byDay.values()) {
        insert('weight_logs', { pet_id: petId, measured_on: w.measured_on, weight_kg: Number(w.weight_kg), notes: text(w.notes) })
      }

      return petId
    })()
  } catch (err) {
    removeFiles(written)
    throw err
  }
}

// POST /api/pets/import (multipart, campo "file") — crea una mascota nueva del usuario
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })
  let zip
  try { zip = new AdmZip(req.file.buffer) } catch { return res.status(400).json({ error: 'El archivo no es un ZIP válido' }) }

  try {
    const petId = importPet(zip, req.user.id)
    res.status(201).json({ ...db.prepare('SELECT * FROM pets WHERE id = ?').get(petId), access: 'owner' })
  } catch (err) {
    if (err instanceof ImportError) return res.status(400).json({ error: err.message })
    throw err
  }
})

module.exports = router
