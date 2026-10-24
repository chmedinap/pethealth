const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const { setupEnv, client } = require('./helpers')

setupEnv()
const app = require('../src/app')
const { request, register, as, createPet } = client(app)
const { fold, escapeText } = require('../src/ics')
const notify = require('../src/notify')
const { todayISO, addDaysISO } = require('../src/validate')

let token, pet

before(async () => {
  token = await register('celia')
  pet = await createPet(token, { name: 'Ñoño', species: 'dog' })
  const today = todayISO()
  await as(token).post(`/api/pets/${pet.id}/checkups`).send({
    vet_name: 'a', checkup_date: addDaysISO(today, -2), reason: 'Control; revisión, general', next_visit_date: addDaysISO(today, 7),
    medications: [{ name: 'Omega 3', frequency: 'Una vez al día', duration_days: 30 }],
  })
  await as(token).post(`/api/pets/${pet.id}/vaccines`).send({ name: 'Rabia', date_given: addDaysISO(today, -300), next_due_date: addDaysISO(today, 1) })
})

describe('feed de calendario (.ics)', () => {
  let url

  it('sin token no hay feed', async () => {
    const me = (await as(token).get('/api/users/me')).body
    assert.equal(me.calendarToken, null)
    assert.equal((await request().get('/api/calendar/abc.ics')).status, 404)
  })

  it('genera un feed con visitas, vacunas y tratamientos', async () => {
    const me = (await as(token).post('/api/users/me/calendar-token')).body
    assert.match(me.calendarToken, /^[a-f0-9]{48}$/)
    url = `/api/calendar/${me.calendarToken}.ics`

    const res = await request().get(url)
    assert.equal(res.status, 200)
    assert.match(res.headers['content-type'], /text\/calendar/)
    const body = res.text
    assert.ok(body.startsWith('BEGIN:VCALENDAR\r\n'))
    assert.ok(body.trimEnd().endsWith('END:VCALENDAR'))
    assert.equal((body.match(/BEGIN:VEVENT/g) || []).length, 3)
    assert.ok(body.includes('Control\\; revisión\\, general'), 'escapa ; y ,')
    assert.ok(body.includes(`DTSTART;VALUE=DATE:${addDaysISO(todayISO(), 7).replace(/-/g, '')}`))
    assert.ok(body.includes('BEGIN:VALARM'))
    for (const line of body.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, `línea demasiado larga: ${line}`)
  })

  it('regenerar el token invalida la URL anterior', async () => {
    await as(token).post('/api/users/me/calendar-token')
    assert.equal((await request().get(url)).status, 404)
  })

  it('se puede desactivar', async () => {
    const me = (await as(token).delete('/api/users/me/calendar-token')).body
    assert.equal(me.calendarToken, null)
  })

  it('pliega líneas sin partir caracteres UTF-8', () => {
    const folded = fold('SUMMARY:' + 'ñ'.repeat(80))
    for (const line of folded.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75)
    assert.equal(folded.split('\r\n').map((l, i) => (i ? l.slice(1) : l)).join(''), 'SUMMARY:' + 'ñ'.repeat(80))
    assert.equal(escapeText('a\nb'), 'a\\nb')
  })
})

describe('resumen por correo', () => {
  const sent = []

  before(async () => {
    notify.setTransport({ sendMail: async msg => { sent.push(msg) } })
    await as(token).put('/api/users/me').send({ email: 'celia@example.com', notify_email: true, lang: 'es' })
  })

  it('solo avisa en los días clave (7 días, mañana, hoy, 3 días vencido)', () => {
    const today = '2025-03-01'
    const due = date => ({ today, due: [{ date }], medications: [] })
    assert.equal(notify.shouldNotify(due('2025-03-08')), true)
    assert.equal(notify.shouldNotify(due('2025-03-02')), true)
    assert.equal(notify.shouldNotify(due('2025-03-01')), true)
    assert.equal(notify.shouldNotify(due('2025-02-26')), true)
    assert.equal(notify.shouldNotify(due('2025-03-05')), false)
    assert.equal(notify.shouldNotify(due('2025-01-01')), false)
  })

  it('envía una vez por día', async () => {
    const today = todayISO() // la vacuna vence mañana → día de aviso
    assert.equal(await notify.runDigests(today), 1)
    assert.equal(sent.length, 1)
    assert.equal(sent[0].to, 'celia@example.com')
    assert.match(sent[0].subject, /2 cuidados pendientes/)
    assert.match(sent[0].text, /Ñoño · Vacuna: Rabia/)
    assert.match(sent[0].text, /Omega 3/)

    assert.equal(await notify.runDigests(today), 0, 'no repite el mismo día')
  })

  it('el correo de prueba se envía aunque no sea día de aviso', async () => {
    const before = sent.length
    const res = await as(token).post('/api/users/me/test-email').send({ today: '2020-01-01' })
    assert.equal(res.status, 200)
    assert.equal(sent.length, before + 1)
  })

  it('respeta el idioma del usuario y escapa el HTML', () => {
    const { subject, html } = notify.buildDigest({ username: '<b>x</b>', lang: 'en' }, { today: '2025-03-01', due: [{ type: 'visit', pet_name: '<script>', title: 'B', date: '2025-03-02', status: 'upcoming' }], medications: [] })
    assert.equal(subject, 'PetHealth: 1 care item due')
    assert.ok(!html.includes('<script>') && !html.includes('<b>x</b>'))
  })
})
