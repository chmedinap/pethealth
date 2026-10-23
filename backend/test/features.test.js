const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const { setupEnv, client } = require('./helpers')

setupEnv()
const app = require('../src/app')
const { register, as, createPet } = client(app)

let token

before(async () => {
  token = await register('frida')
})

describe('especies', () => {
  it('acepta especies nuevas', async () => {
    const pet = await createPet(token, { name: 'Copito', species: 'rabbit' })
    assert.equal(pet.species, 'rabbit')
  })

  it('rechaza especies desconocidas', async () => {
    const res = await as(token).post('/api/pets').send({ name: 'Nemo', species: 'dragon' })
    assert.equal(res.status, 400)
  })
})

describe('validación de fechas', () => {
  it('rechaza fechas con formato o valor inválido', async () => {
    const pet = await createPet(token)
    for (const date of ['15/01/2024', '2024-02-31', 'mañana']) {
      const res = await as(token).post(`/api/pets/${pet.id}/checkups`).send({ vet_name: 'a', checkup_date: date, reason: 'x' })
      assert.equal(res.status, 400, date)
    }
  })
})

describe('historial de peso', () => {
  let pet
  const weights = async () => (await as(token).get(`/api/pets/${pet.id}/weights`)).body
  const current = async () => (await as(token).get(`/api/pets/${pet.id}`)).body.weight_kg

  before(async () => {
    pet = await createPet(token, { name: 'Pesado', species: 'dog', weight_kg: 10 })
  })

  it('el peso inicial queda como primer registro', async () => {
    assert.deepEqual((await weights()).map(w => w.weight_kg), [10])
  })

  it('un registro antiguo no cambia el peso actual', async () => {
    await as(token).post(`/api/pets/${pet.id}/weights`).send({ measured_on: '2020-01-01', weight_kg: 4 })
    assert.equal(await current(), 10)
    assert.equal((await weights())[0].measured_on, '2020-01-01', 'ordenado por fecha')
  })

  it('un registro más reciente sí lo actualiza', async () => {
    await as(token).post(`/api/pets/${pet.id}/weights`).send({ measured_on: '2999-01-01', weight_kg: 12.5 })
    assert.equal(await current(), 12.5)
  })

  it('la misma fecha actualiza en lugar de duplicar', async () => {
    await as(token).post(`/api/pets/${pet.id}/weights`).send({ measured_on: '2999-01-01', weight_kg: 13 })
    const list = await weights()
    assert.equal(list.filter(w => w.measured_on === '2999-01-01').length, 1)
    assert.equal(await current(), 13)
  })

  it('borrar el último registro vuelve al anterior', async () => {
    const latest = (await weights()).at(-1)
    await as(token).delete(`/api/weights/${latest.id}`)
    assert.equal(await current(), 10)
  })

  it('editar el peso desde el perfil lo agrega al historial', async () => {
    await as(token).put(`/api/pets/${pet.id}`).send({ weight_kg: 11 })
    assert.equal((await weights()).at(-1).weight_kg, 11)
  })

  it('valida los datos', async () => {
    assert.equal((await as(token).post(`/api/pets/${pet.id}/weights`).send({ measured_on: '2024-01-01', weight_kg: -1 })).status, 400)
    assert.equal((await as(token).post(`/api/pets/${pet.id}/weights`).send({ measured_on: 'ayer', weight_kg: 5 })).status, 400)
  })
})

describe('vacunas', () => {
  let pet, vaccine

  before(async () => {
    pet = await createPet(token, { name: 'Vacunado', species: 'dog' })
  })

  it('crea, edita y borra', async () => {
    const res = await as(token).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'Rabia', date_given: '2024-01-01', next_due_date: '2025-01-01' })
    assert.equal(res.status, 201)
    vaccine = res.body

    const upd = await as(token).put(`/api/vaccines/${vaccine.id}`).send({ batch_number: 'L-123' })
    assert.equal(upd.body.batch_number, 'L-123')

    assert.equal((await as(token).delete(`/api/vaccines/${vaccine.id}`)).status, 200)
    assert.deepEqual((await as(token).get(`/api/pets/${pet.id}/vaccines`)).body, [])
  })

  it('el refuerzo no puede ser anterior a la aplicación', async () => {
    const res = await as(token).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'Rabia', date_given: '2024-06-01', next_due_date: '2024-01-01' })
    assert.equal(res.status, 400)
  })
})

describe('recordatorios', () => {
  let pet, otherToken
  const TODAY = '2025-03-01'
  const reminders = async (t = token) => (await as(t).get(`/api/reminders?today=${TODAY}&days=30`)).body

  before(async () => {
    pet = await createPet(token, { name: 'Recordada', species: 'cat' })
    // Consulta antigua con próxima visita ya pasada, "cumplida" por una consulta posterior
    await as(token).post(`/api/pets/${pet.id}/checkups`).send({ vet_name: 'a', checkup_date: '2024-01-01', reason: 'Vieja', next_visit_date: '2024-02-01' })
    // La consulta más reciente define la próxima visita: vencida respecto a TODAY
    await as(token).post(`/api/pets/${pet.id}/checkups`).send({
      vet_name: 'a', checkup_date: '2025-02-20', reason: 'Reciente', next_visit_date: '2025-02-25',
      medications: [
        { name: 'Activo', frequency: 'diaria', duration_days: 14 },   // termina 2025-03-05
        { name: 'Terminado', frequency: 'diaria', duration_days: 3 },  // terminó 2025-02-22
        { name: 'Sin duración', frequency: 'diaria' },
      ],
    })
    // Vacunas: una dosis vieja reemplazada por otra más reciente; otra que vence pronto; otra lejana
    await as(token).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'Triple felina', date_given: '2023-01-01', next_due_date: '2024-01-01' })
    await as(token).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'triple felina', date_given: '2024-03-10', next_due_date: '2025-03-10' })
    await as(token).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'Rabia', date_given: '2024-06-01', next_due_date: '2026-06-01' })

    otherToken = await register('gael')
  })

  it('incluye la próxima visita vencida y la vacuna próxima, en orden', async () => {
    const { due } = await reminders()
    const mine = due.filter(d => d.pet_id === pet.id)
    assert.deepEqual(mine.map(d => [d.type, d.title, d.status]), [
      ['visit', 'Reciente', 'overdue'],
      ['vaccine', 'triple felina', 'upcoming'],
    ])
  })

  it('solo lista tratamientos en curso', async () => {
    const { medications } = await reminders()
    const mine = medications.filter(m => m.pet_id === pet.id)
    assert.deepEqual(mine.map(m => [m.title, m.date]), [['Activo', '2025-03-05']])
  })

  it('no muestra recordatorios de mascotas ajenas, salvo compartidas', async () => {
    assert.equal((await reminders(otherToken)).due.length, 0)
    await as(token).post(`/api/pets/${pet.id}/shares`).send({ username: 'gael', role: 'viewer' })
    assert.equal((await reminders(otherToken)).due.length, 2)
  })
})

describe('exámenes', () => {
  it('no permite asociar una consulta de otra mascota', async () => {
    const a = await createPet(token, { name: 'A' })
    const b = await createPet(token, { name: 'B' })
    const c = (await as(token).post(`/api/pets/${a.id}/checkups`).send({ vet_name: 'a', checkup_date: '2024-01-01', reason: 'x' })).body
    const res = await as(token).post(`/api/pets/${b.id}/exams`).field('exam_type', 'X').field('exam_date', '2024-01-01').field('checkup_id', String(c.id))
    assert.equal(res.status, 400)
  })
})
