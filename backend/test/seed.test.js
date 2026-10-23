const { it } = require('node:test')
const assert = require('node:assert/strict')
const { setupEnv, client } = require('./helpers')

setupEnv()
const app = require('../src/app')
const { login, as } = client(app)

it('la demo trae 4 mascotas con recordatorios vigentes respecto a hoy', async () => {
  const first = await login('admin', 'admin123')
  const token = (await as(first).put('/api/users/me/password').send({ current_password: 'admin123', new_password: 'demoClave99' })).body.token

  const pets = (await as(token).get('/api/pets')).body
  assert.deepEqual(pets.map(p => [p.name, p.species]).sort(), [['Copito', 'rabbit'], ['Luna', 'cat'], ['Milo', 'dog'], ['Rocky', 'dog']])

  // El peso actual coincide con el último registro del historial
  for (const pet of pets) {
    const weights = (await as(token).get(`/api/pets/${pet.id}/weights`)).body
    assert.equal(pet.weight_kg, weights.at(-1).weight_kg, pet.name)
  }

  // Sin parámetro `today`: usa la fecha real, así que la demo siempre muestra de todo
  const { due, medications } = (await as(token).get('/api/reminders')).body
  assert.ok(due.some(d => d.status === 'overdue'), 'hay algo vencido')
  assert.ok(due.some(d => d.status === 'upcoming'), 'hay algo próximo')
  assert.ok(medications.length >= 2, 'hay tratamientos activos')
  assert.ok(new Set(due.map(d => d.pet_name)).size >= 3, 'los recordatorios se reparten entre varias mascotas')

  // Milo tiene ALT en dos exámenes (para la gráfica de evolución)
  const milo = pets.find(p => p.name === 'Milo')
  const exams = (await as(token).get(`/api/pets/${milo.id}/exams`)).body
  const alt = exams.flatMap(e => e.exam_values).filter(v => v.parameter_name.startsWith('ALT'))
  assert.equal(alt.length, 2)
})
