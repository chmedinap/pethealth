const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { setupEnv, client, PNG, PDF } = require('./helpers')

const dataDir = setupEnv()
const app = require('../src/app')
const { request, register, as, createPet } = client(app)

const onDisk = url => fs.existsSync(path.join(dataDir, url))
const cookieOf = res => res.headers['set-cookie'][0].split(';')[0]

let alice, bob, carol, pet, checkup, exam, photoUrl, aliceCookie, bobCookie

before(async () => {
  alice = await register('alice')
  bob = await register('bob')
  carol = await register('carol')

  pet = await createPet(alice, { name: 'Luna', species: 'dog', weight_kg: 20 })
  checkup = (await as(alice).post(`/api/pets/${pet.id}/checkups`).send({
    vet_name: 'Dra. Ruiz', checkup_date: '2024-01-10', reason: 'Control',
    medications: [{ name: 'Med', frequency: 'Cada 12 horas' }],
  })).body
  exam = (await as(alice).post(`/api/pets/${pet.id}/exams`).field('exam_type', 'Hemograma').field('exam_date', '2024-01-10')).body
  photoUrl = (await as(alice).post(`/api/pets/${pet.id}/photo`).attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' })).body.photo_url

  aliceCookie = cookieOf(await request().post('/api/auth/login').send({ username: 'alice', password: 'password123' }))
  bobCookie = cookieOf(await request().post('/api/auth/login').send({ username: 'bob', password: 'password123' }))
})

describe('aislamiento entre usuarios', () => {
  it('bob no ve las mascotas de alice', async () => {
    assert.deepEqual((await as(bob).get('/api/pets')).body, [])
  })

  // Las URLs son funciones porque los ids se conocen recién después de before()
  for (const [title, method, url] of [
    ['GET /api/pets/:id', 'get', () => `/api/pets/${pet.id}`],
    ['PUT /api/pets/:id', 'put', () => `/api/pets/${pet.id}`],
    ['DELETE /api/pets/:id', 'delete', () => `/api/pets/${pet.id}`],
    ['GET /api/pets/:id/checkups', 'get', () => `/api/pets/${pet.id}/checkups`],
    ['POST /api/pets/:id/vaccines', 'post', () => `/api/pets/${pet.id}/vaccines`],
    ['GET /api/pets/:id/weights', 'get', () => `/api/pets/${pet.id}/weights`],
    ['GET /api/checkups/:id', 'get', () => `/api/checkups/${checkup.id}`],
    ['DELETE /api/medications/:id', 'delete', () => `/api/medications/${checkup.medications[0].id}`],
    ['DELETE /api/exams/:id', 'delete', () => `/api/exams/${exam.id}`],
  ]) {
    it(`${title} → 404`, async () => {
      assert.equal((await as(bob)[method](url()).send({ name: 'x' })).status, 404)
    })
  }

  it('bob no puede subir archivos a la mascota de alice (y no se escribe nada)', async () => {
    const before = fs.readdirSync(path.join(dataDir, 'uploads/photos')).length
    const res = await as(bob).post(`/api/pets/${pet.id}/photo`).attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' })
    assert.equal(res.status, 404)
    assert.equal(fs.readdirSync(path.join(dataDir, 'uploads/photos')).length, before)
  })
})

describe('archivos', () => {
  it('sin sesión → 401', async () => {
    assert.equal((await request().get(photoUrl)).status, 401)
  })

  it('con la cookie de la dueña → 200', async () => {
    assert.equal((await request().get(photoUrl).set('Cookie', aliceCookie)).status, 200)
  })

  it('con la cookie de otro usuario → 404', async () => {
    assert.equal((await request().get(photoUrl).set('Cookie', bobCookie)).status, 404)
  })

  it('rechaza tipos no permitidos', async () => {
    const res = await as(alice).post(`/api/pets/${pet.id}/photo`).attach('photo', Buffer.from('<script>'), { filename: 'x.html', contentType: 'text/html' })
    assert.equal(res.status, 400)
  })

  it('no permite path traversal', async () => {
    assert.equal((await request().get('/uploads/../pethealth.db').set('Cookie', aliceCookie)).status, 404)
    assert.equal((await request().get('/uploads/%2e%2e/pethealth.db').set('Cookie', aliceCookie)).status, 404)
  })

  it('máximo 3 adjuntos por consulta', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await as(alice).post(`/api/checkups/${checkup.id}/attachments`).attach('file', PDF, { filename: 'r.pdf', contentType: 'application/pdf' })
      assert.equal(r.status, 201)
    }
    const r = await as(alice).post(`/api/checkups/${checkup.id}/attachments`).attach('file', PDF, { filename: 'r.pdf', contentType: 'application/pdf' })
    assert.equal(r.status, 400)
  })
})

describe('compartir con rol de lector', () => {
  before(async () => {
    const res = await as(alice).post(`/api/pets/${pet.id}/shares`).send({ username: 'bob', role: 'viewer' })
    assert.equal(res.status, 201)
  })

  it('bob ve la mascota con access=viewer y el nombre de la dueña', async () => {
    const [shared] = (await as(bob).get('/api/pets')).body
    assert.equal(shared.id, pet.id)
    assert.equal(shared.access, 'viewer')
    assert.equal(shared.owner_username, 'alice')
  })

  it('puede leer el historial y los archivos', async () => {
    assert.equal((await as(bob).get(`/api/pets/${pet.id}/checkups`)).status, 200)
    assert.equal((await request().get(photoUrl).set('Cookie', bobCookie)).status, 200)
  })

  it('no puede modificar nada → 403', async () => {
    assert.equal((await as(bob).put(`/api/pets/${pet.id}`).send({ name: 'X' })).status, 403)
    assert.equal((await as(bob).post(`/api/pets/${pet.id}/checkups`).send({ vet_name: 'a', checkup_date: '2024-01-01', reason: 'x' })).status, 403)
    assert.equal((await as(bob).delete(`/api/checkups/${checkup.id}`)).status, 403)
    assert.equal((await as(bob).post(`/api/pets/${pet.id}/weights`).send({ measured_on: '2024-01-01', weight_kg: 3 })).status, 403)
  })

  it('carol (sin acceso) sigue sin ver nada', async () => {
    assert.equal((await as(carol).get(`/api/pets/${pet.id}`)).status, 404)
  })
})

describe('compartir con rol de editor', () => {
  before(async () => {
    await as(alice).post(`/api/pets/${pet.id}/shares`).send({ username: 'bob', role: 'editor' })
  })

  it('bob puede crear registros', async () => {
    const res = await as(bob).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'Rabia', date_given: '2024-01-10' })
    assert.equal(res.status, 201)
  })

  it('pero no borrar la mascota ni gestionar accesos', async () => {
    assert.equal((await as(bob).delete(`/api/pets/${pet.id}`)).status, 403)
    assert.equal((await as(bob).get(`/api/pets/${pet.id}/shares`)).status, 403)
    assert.equal((await as(bob).post(`/api/pets/${pet.id}/shares`).send({ username: 'carol' })).status, 403)
  })

  it('valida el usuario destino', async () => {
    assert.equal((await as(alice).post(`/api/pets/${pet.id}/shares`).send({ username: 'nadie' })).status, 404)
    assert.equal((await as(alice).post(`/api/pets/${pet.id}/shares`).send({ username: 'alice' })).status, 400)
    assert.equal((await as(alice).post(`/api/pets/${pet.id}/shares`).send({ username: 'carol', role: 'admin' })).status, 400)
  })

  it('la dueña ve la lista de accesos', async () => {
    const res = await as(alice).get(`/api/pets/${pet.id}/shares`)
    assert.deepEqual(res.body.map(s => [s.username, s.role]), [['bob', 'editor']])
  })

  it('bob puede dejar de seguir la mascota', async () => {
    const me = (await as(bob).get('/api/users/me')).body
    assert.equal((await as(bob).delete(`/api/pets/${pet.id}/shares/${me.id}`)).status, 200)
    assert.equal((await as(bob).get(`/api/pets/${pet.id}`)).status, 404)
  })
})

describe('borrar una mascota', () => {
  it('elimina sus archivos del disco y sus accesos compartidos', async () => {
    const p = await createPet(alice, { name: 'Temporal' })
    const photo = (await as(alice).post(`/api/pets/${p.id}/photo`).attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' })).body.photo_url
    const c = (await as(alice).post(`/api/pets/${p.id}/checkups`).send({ vet_name: 'a', checkup_date: '2024-01-01', reason: 'x' })).body
    const att = (await as(alice).post(`/api/checkups/${c.id}/attachments`).attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })).body.file_url
    const pdf = (await as(alice).post(`/api/pets/${p.id}/exams`).field('exam_type', 'X').field('exam_date', '2024-01-01')
      .attach('pdf', PDF, { filename: 'e.pdf', contentType: 'application/pdf' })).body.pdf_url
    await as(alice).post(`/api/pets/${p.id}/shares`).send({ username: 'carol' })

    for (const url of [photo, att, pdf]) assert.ok(onDisk(url), `${url} debería existir`)
    assert.equal((await as(alice).delete(`/api/pets/${p.id}`)).status, 200)
    await new Promise(r => setTimeout(r, 50)) // fs.unlink es asíncrono
    for (const url of [photo, att, pdf]) assert.ok(!onDisk(url), `${url} debería haberse borrado`)

    const db = require('../src/db')
    assert.equal(db.prepare('SELECT COUNT(*) c FROM pet_shares WHERE pet_id = ?').get(p.id).c, 0)
    assert.equal(db.prepare("SELECT COUNT(*) c FROM attachments WHERE entity_type = 'checkup' AND entity_id = ?").get(c.id).c, 0)
  })
})
