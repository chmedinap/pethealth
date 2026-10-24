const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const { setupEnv, client } = require('./helpers')

setupEnv()
const app = require('../src/app')
const { register, as, createPet } = client(app)

let token, other

before(async () => {
  token = await register('olivia')
  other = await register('mateo')
})

describe('antiparasitarios', () => {
  let pet

  before(async () => {
    pet = await createPet(token, { name: 'Bicho', species: 'dog' })
  })

  it('crea, edita y borra', async () => {
    const res = await as(token).post(`/api/pets/${pet.id}/parasites`).send({ kind: 'external', product: 'Bravecto', date_given: '2025-01-01', next_due_date: '2025-04-01', cost: '38.5' })
    assert.equal(res.status, 201)
    assert.equal(res.body.cost, 38.5)

    const upd = await as(token).put(`/api/parasites/${res.body.id}`).send({ notes: 'Masticable' })
    assert.equal(upd.body.notes, 'Masticable')

    assert.equal((await as(token).delete(`/api/parasites/${res.body.id}`)).status, 200)
    assert.deepEqual((await as(token).get(`/api/pets/${pet.id}/parasites`)).body, [])
  })

  it('valida tipo, fechas y costo', async () => {
    const post = body => as(token).post(`/api/pets/${pet.id}/parasites`).send({ kind: 'internal', product: 'X', date_given: '2025-01-01', ...body })
    assert.equal((await post({ kind: 'magic' })).status, 400)
    assert.equal((await post({ next_due_date: '2024-12-01' })).status, 400)
    assert.equal((await post({ cost: -3 })).status, 400)
    assert.equal((await post({ product: ' ' })).status, 400)
  })

  it('otro usuario no puede verlos', async () => {
    assert.equal((await as(other).get(`/api/pets/${pet.id}/parasites`)).status, 404)
  })

  it('el último de cada tipo define el recordatorio', async () => {
    const post = body => as(token).post(`/api/pets/${pet.id}/parasites`).send(body)
    await post({ kind: 'internal', product: 'Drontal', date_given: '2025-01-01', next_due_date: '2025-02-01' })
    // Cambio de marca: reemplaza al anterior del mismo tipo
    await post({ kind: 'internal', product: 'Milbemax', date_given: '2025-02-01', next_due_date: '2025-03-05' })
    const { due } = (await as(token).get('/api/reminders?today=2025-03-01&days=30')).body
    const mine = due.filter(d => d.pet_id === pet.id)
    assert.deepEqual(mine.map(d => [d.type, d.title, d.detail, d.status]), [['parasite', 'Milbemax', 'internal', 'upcoming']])
  })
})

describe('alergias y condiciones crónicas', () => {
  let pet

  before(async () => {
    pet = await createPet(token, { name: 'Alérgico', species: 'cat' })
  })

  it('crea y lista primero las alergias', async () => {
    await as(token).post(`/api/pets/${pet.id}/conditions`).send({ kind: 'chronic', name: 'Diabetes' })
    const res = await as(token).post(`/api/pets/${pet.id}/conditions`).send({ kind: 'allergy', name: 'Pollo', since: '2023-05-01' })
    assert.equal(res.status, 201)
    const list = (await as(token).get(`/api/pets/${pet.id}/conditions`)).body
    assert.deepEqual(list.map(c => c.name), ['Pollo', 'Diabetes'])
  })

  it('valida y edita', async () => {
    assert.equal((await as(token).post(`/api/pets/${pet.id}/conditions`).send({ kind: 'otra', name: 'x' })).status, 400)
    assert.equal((await as(token).post(`/api/pets/${pet.id}/conditions`).send({ kind: 'allergy', name: 'x', since: 'ayer' })).status, 400)
    const [first] = (await as(token).get(`/api/pets/${pet.id}/conditions`)).body
    const upd = await as(token).put(`/api/conditions/${first.id}`).send({ notes: 'Prurito' })
    assert.equal(upd.body.notes, 'Prurito')
    assert.equal((await as(other).delete(`/api/conditions/${first.id}`)).status, 404)
  })
})

describe('costos', () => {
  let pet

  before(async () => {
    pet = await createPet(token, { name: 'Caro', species: 'dog' })
  })

  it('se guardan en consultas, exámenes y vacunas', async () => {
    const checkup = await as(token).post(`/api/pets/${pet.id}/checkups`).send({ vet_name: 'a', checkup_date: '2025-01-01', reason: 'x', cost: 45 })
    assert.equal(checkup.body.cost, 45)
    const upd = await as(token).put(`/api/checkups/${checkup.body.id}`).send({ cost: '' })
    assert.equal(upd.body.cost, null, 'vaciar el campo lo borra')

    const exam = await as(token).post(`/api/pets/${pet.id}/exams`).field('exam_type', 'Hemograma').field('exam_date', '2025-01-01').field('cost', '30.25')
    assert.equal(exam.body.cost, 30.25)

    const vaccine = await as(token).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'Rabia', date_given: '2025-01-01', cost: 20 })
    assert.equal(vaccine.body.cost, 20)
  })

  it('rechaza costos negativos o no numéricos', async () => {
    assert.equal((await as(token).post(`/api/pets/${pet.id}/checkups`).send({ vet_name: 'a', checkup_date: '2025-01-01', reason: 'x', cost: -1 })).status, 400)
    assert.equal((await as(token).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'Rabia', date_given: '2025-01-01', cost: 'caro' })).status, 400)
  })
})

describe('dosis administradas', () => {
  let pet, med, viewer

  before(async () => {
    pet = await createPet(token, { name: 'Paciente', species: 'cat' })
    const checkup = (await as(token).post(`/api/pets/${pet.id}/checkups`).send({
      vet_name: 'a', checkup_date: '2025-03-01', reason: 'x',
      medications: [{ name: 'Antibiótico', frequency: 'Cada 12 horas', duration_days: 7 }],
    })).body
    med = checkup.medications[0]
    viewer = await register('vera')
    await as(token).post(`/api/pets/${pet.id}/shares`).send({ username: 'vera', role: 'viewer' })
  })

  it('registra dosis y las muestra en el recordatorio del día', async () => {
    const res = await as(token).post(`/api/medications/${med.id}/doses`).send({ given_on: '2025-03-02', given_time: '08:15' })
    assert.equal(res.status, 201)
    assert.equal(res.body.given_by_username, 'olivia')

    const { medications } = (await as(token).get('/api/reminders?today=2025-03-02')).body
    const item = medications.find(m => m.ref_id === med.id)
    assert.deepEqual(item.doses_today.map(d => d.given_time), ['08:15'])
    assert.equal(item.access, 'owner')

    const next = (await as(token).get('/api/reminders?today=2025-03-03')).body.medications.find(m => m.ref_id === med.id)
    assert.deepEqual(next.doses_today, [], 'cada día empieza vacío')
  })

  it('el medicamento informa el total y la última dosis', async () => {
    await as(token).post(`/api/medications/${med.id}/doses`).send({ given_on: '2025-03-02', given_time: '20:00' })
    const [checkup] = (await as(token).get(`/api/pets/${pet.id}/checkups`)).body
    assert.equal(checkup.medications[0].dose_count, 2)
    assert.equal(checkup.medications[0].last_dose, '2025-03-02 20:00')
  })

  it('valida fecha y hora', async () => {
    assert.equal((await as(token).post(`/api/medications/${med.id}/doses`).send({ given_on: 'hoy' })).status, 400)
    assert.equal((await as(token).post(`/api/medications/${med.id}/doses`).send({ given_on: '2025-03-02', given_time: '25:00' })).status, 400)
  })

  it('solo lectura puede ver pero no registrar ni borrar', async () => {
    const doses = (await as(viewer).get(`/api/medications/${med.id}/doses`)).body
    assert.equal(doses.length, 2)
    assert.equal((await as(viewer).post(`/api/medications/${med.id}/doses`).send({ given_on: '2025-03-02' })).status, 403)
    assert.equal((await as(viewer).delete(`/api/doses/${doses[0].id}`)).status, 403)
    assert.equal((await as(other).delete(`/api/doses/${doses[0].id}`)).status, 404)
    const vItem = (await as(viewer).get('/api/reminders?today=2025-03-02')).body.medications.find(m => m.ref_id === med.id)
    assert.equal(vItem.access, 'viewer')
  })

  it('se puede deshacer una dosis', async () => {
    const [latest] = (await as(token).get(`/api/medications/${med.id}/doses`)).body
    assert.equal((await as(token).delete(`/api/doses/${latest.id}`)).status, 200)
    assert.equal((await as(token).get(`/api/medications/${med.id}/doses`)).body.length, 1)
  })
})

describe('directorio de veterinarios', () => {
  it('es personal: cada usuario ve solo los suyos', async () => {
    const res = await as(token).post('/api/vets').send({ name: 'Dra. Ruiz', clinic: 'VetCare', phone: '555' })
    assert.equal(res.status, 201)
    assert.deepEqual((await as(other).get('/api/vets')).body, [])
    assert.equal((await as(other).put(`/api/vets/${res.body.id}`).send({ name: 'x' })).status, 404)
    assert.equal((await as(other).delete(`/api/vets/${res.body.id}`)).status, 404)
  })

  it('valida nombre y correo', async () => {
    assert.equal((await as(token).post('/api/vets').send({ name: '' })).status, 400)
    assert.equal((await as(token).post('/api/vets').send({ name: 'x', email: 'no-es-correo' })).status, 400)
  })

  it('importa los veterinarios del historial sin duplicar', async () => {
    const pet = await createPet(token, { name: 'Historial', species: 'dog' })
    await as(token).post(`/api/pets/${pet.id}/checkups`).send({ vet_name: 'Dr. Paz', clinic_name: 'Clínica Norte', checkup_date: '2025-01-01', reason: 'x' })
    await as(token).post(`/api/pets/${pet.id}/checkups`).send({ vet_name: 'dr. paz', clinic_name: 'Clínica Sur', checkup_date: '2025-02-01', reason: 'x' })
    await as(token).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'Rabia', date_given: '2025-01-01', vet_name: 'Dra. Ruiz' })

    const first = (await as(token).post('/api/vets/import-history')).body
    const paz = first.vets.filter(v => v.name.toLowerCase() === 'dr. paz')
    assert.equal(paz.length, 1, 'mismo nombre sin distinguir mayúsculas')
    assert.equal(paz[0].clinic, 'Clínica Sur', 'toma la clínica de la consulta más reciente')
    assert.equal(first.vets.filter(v => v.name === 'Dra. Ruiz').length, 1, 'ya existía en el directorio')

    const again = (await as(token).post('/api/vets/import-history')).body
    assert.equal(again.added, 0)
  })
})

describe('preferencias de la cuenta', () => {
  it('guarda correo, moneda e idioma', async () => {
    const res = await as(token).put('/api/users/me').send({ email: 'olivia@example.com', currency: 'cop', lang: 'en' })
    assert.equal(res.status, 200)
    assert.equal(res.body.email, 'olivia@example.com')
    assert.equal(res.body.currency, 'COP')
    assert.equal(res.body.lang, 'en')
    assert.equal(res.body.emailEnabled, false, 'el servidor de pruebas no tiene SMTP')
  })

  it('valida los datos', async () => {
    assert.equal((await as(token).put('/api/users/me').send({ email: 'x@' })).status, 400)
    assert.equal((await as(token).put('/api/users/me').send({ currency: 'PESOS' })).status, 400)
    assert.equal((await as(token).put('/api/users/me').send({ lang: 'fr' })).status, 400)
    assert.equal((await as(other).put('/api/users/me').send({ notify_email: true })).status, 400, 'sin correo no hay avisos')
  })

  it('sin SMTP el correo de prueba avisa del problema', async () => {
    const res = await as(token).post('/api/users/me/test-email')
    assert.equal(res.status, 400)
  })
})
