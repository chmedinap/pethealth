const { it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')
const { setupEnv, client, PNG, PDF } = require('./helpers')

const dataDir = setupEnv()
const app = require('../src/app')
const { register, as, createPet } = client(app)

// supertest no junta binarios por defecto
const binary = (res, cb) => {
  const chunks = []
  res.on('data', c => chunks.push(c))
  res.on('end', () => cb(null, Buffer.concat(chunks)))
}

let ana, beto, pet, zipBuffer

before(async () => {
  ana = await register('ana')
  beto = await register('beto')
  pet = await createPet(ana, { name: 'Viajero', species: 'rabbit', weight_kg: 2 })
  await as(ana).post(`/api/pets/${pet.id}/photo`).attach('photo', PNG, { filename: 'p.png', contentType: 'image/png' })
  const checkup = (await as(ana).post(`/api/pets/${pet.id}/checkups`).send({
    vet_name: 'Dra. Ruiz', checkup_date: '2025-01-10', reason: 'Control', cost: 40,
    medications: [{ name: 'Meloxicam', frequency: 'Una vez al día', duration_days: 3 }],
  })).body
  await as(ana).post(`/api/medications/${checkup.medications[0].id}/doses`).send({ given_on: '2025-01-10', given_time: '09:00' })
  await as(ana).post(`/api/checkups/${checkup.id}/attachments`).attach('file', PDF, { filename: 'receta.pdf', contentType: 'application/pdf' })
  await as(ana).post(`/api/pets/${pet.id}/exams`)
    .field('exam_type', 'Hemograma').field('exam_date', '2025-01-10').field('checkup_id', String(checkup.id))
    .field('values', JSON.stringify([{ parameter_name: 'Hematocrito', value: '40', unit: '%', is_abnormal: 0 }]))
    .attach('pdf', PDF, { filename: 'h.pdf', contentType: 'application/pdf' })
  await as(ana).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'Mixomatosis', date_given: '2025-01-10', next_due_date: '2025-07-10' })
  await as(ana).post(`/api/pets/${pet.id}/parasites`).send({ kind: 'internal', product: 'Panacur', date_given: '2025-01-10' })
  await as(ana).post(`/api/pets/${pet.id}/conditions`).send({ kind: 'allergy', name: 'Alfalfa' })
  await as(ana).post(`/api/pets/${pet.id}/weights`).send({ measured_on: '2025-01-10', weight_kg: 2.3 })
})

it('exporta un ZIP con el historial y los archivos', async () => {
  const res = await as(ana).get(`/api/pets/${pet.id}/export`).buffer(true).parse(binary)
  assert.equal(res.status, 200)
  assert.match(res.headers['content-disposition'], /pethealth-viajero-.*\.zip/)
  zipBuffer = res.body

  const zip = new AdmZip(zipBuffer)
  const data = JSON.parse(zip.getEntry('pet.json').getData().toString())
  assert.equal(data.format, 'pethealth-pet')
  assert.equal(data.pet.name, 'Viajero')
  assert.equal(data.checkups[0].medications[0].doses.length, 1)
  assert.equal(data.exams[0].checkup_ref, data.checkups[0].ref)
  // foto + adjunto + PDF del examen
  assert.equal(zip.getEntries().filter(e => e.entryName.startsWith('files/')).length, 3)
  for (const f of [data.pet.photo, data.exams[0].pdf, data.checkups[0].attachments[0].file]) assert.ok(zip.getEntry(f), f)
})

it('otro usuario no puede exportar', async () => {
  assert.equal((await as(beto).get(`/api/pets/${pet.id}/export`)).status, 404)
})

it('importa como una mascota nueva del usuario, con archivos nuevos', async () => {
  const res = await as(beto).post('/api/pets/import').attach('file', zipBuffer, { filename: 'v.zip', contentType: 'application/zip' })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  const copy = res.body
  assert.notEqual(copy.id, pet.id)
  assert.equal(copy.access, 'owner')
  assert.equal(copy.weight_kg, 2, 'el peso actual es la medición más reciente (la inicial, de hoy)')
  assert.ok(copy.photo_url && copy.photo_url !== pet.photo_url)
  assert.ok(fs.existsSync(path.join(dataDir, copy.photo_url)))

  const checkups = (await as(beto).get(`/api/pets/${copy.id}/checkups`)).body
  assert.equal(checkups[0].cost, 40)
  assert.equal(checkups[0].medications[0].dose_count, 1)
  assert.equal(checkups[0].attachments.length, 1)
  const exams = (await as(beto).get(`/api/pets/${copy.id}/exams`)).body
  assert.equal(exams[0].checkup_id, checkups[0].id, 'mantiene el vínculo examen → consulta')
  assert.ok(exams[0].pdf_url)
  assert.equal(exams[0].exam_values[0].parameter_name, 'Hematocrito')
  assert.equal((await as(beto).get(`/api/pets/${copy.id}/vaccines`)).body.length, 1)
  assert.equal((await as(beto).get(`/api/pets/${copy.id}/parasites`)).body.length, 1)
  assert.equal((await as(beto).get(`/api/pets/${copy.id}/conditions`)).body[0].name, 'Alfalfa')
  assert.equal((await as(beto).get(`/api/pets/${copy.id}/weights`)).body.length, 2)

  // La original sigue intacta y solo la ve ana
  assert.equal((await as(beto).get(`/api/pets/${pet.id}`)).status, 404)
})

it('rechaza archivos que no son exportaciones', async () => {
  const notZip = await as(beto).post('/api/pets/import').attach('file', Buffer.from('hola'), { filename: 'x.zip' })
  assert.equal(notZip.status, 400)

  const wrong = new AdmZip()
  wrong.addFile('pet.json', Buffer.from(JSON.stringify({ format: 'otra-app' })))
  const res = await as(beto).post('/api/pets/import').attach('file', wrong.toBuffer(), { filename: 'x.zip' })
  assert.equal(res.status, 400)
})

it('ignora archivos con rutas o contenido sospechoso', async () => {
  const zip = new AdmZip()
  zip.addFile('pet.json', Buffer.from(JSON.stringify({
    format: 'pethealth-pet', version: 1,
    pet: { name: 'Raro', species: 'dragon', photo: '../../etc/passwd' },
    exams: [{ exam_type: 'X', exam_date: '2025-01-01', pdf: 'files/falso.pdf' }],
  })))
  zip.addFile('files/falso.pdf', Buffer.from('<html>no soy un pdf</html>'))
  const res = await as(beto).post('/api/pets/import').attach('file', zip.toBuffer(), { filename: 'x.zip' })
  assert.equal(res.status, 201)
  assert.equal(res.body.species, 'other')
  assert.equal(res.body.photo_url, null)
  const [exam] = (await as(beto).get(`/api/pets/${res.body.id}/exams`)).body
  assert.equal(exam.pdf_url, null, 'el contenido no es PDF')
})

it('si falta un dato obligatorio no queda nada a medias', async () => {
  const before = (await as(beto).get('/api/pets')).body.length
  const zip = new AdmZip()
  zip.addFile('pet.json', Buffer.from(JSON.stringify({
    format: 'pethealth-pet', version: 1,
    pet: { name: 'Roto', species: 'cat' },
    checkups: [{ vet_name: 'a', reason: 'sin fecha' }],
  })))
  const res = await as(beto).post('/api/pets/import').attach('file', zip.toBuffer(), { filename: 'x.zip' })
  assert.equal(res.status, 400)
  assert.equal((await as(beto).get('/api/pets')).body.length, before)
})
