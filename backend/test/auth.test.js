const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')
const { setupEnv, client } = require('./helpers')

setupEnv()
const app = require('../src/app')
const { request, register, login, as } = client(app)

describe('cuenta admin por defecto', () => {
  let token

  before(async () => {
    token = await login('admin', 'admin123')
  })

  it('el login indica que debe cambiar la contraseña', async () => {
    const res = await request().post('/api/auth/login').send({ username: 'admin', password: 'admin123' })
    assert.equal(res.body.user.mustChangePassword, true)
  })

  it('bloquea el resto de la API hasta cambiarla', async () => {
    const res = await as(token).get('/api/pets')
    assert.equal(res.status, 403)
    assert.equal(res.body.code, 'PASSWORD_CHANGE_REQUIRED')
  })

  it('permite consultar /users/me mientras tanto', async () => {
    const res = await as(token).get('/api/users/me')
    assert.equal(res.status, 200)
    assert.equal(res.body.mustChangePassword, true)
  })

  it('rechaza repetir la misma contraseña', async () => {
    const res = await as(token).put('/api/users/me/password').send({ current_password: 'admin123', new_password: 'admin123' })
    assert.equal(res.status, 400)
  })

  it('al cambiarla se desbloquea, devuelve un token nuevo y revoca el anterior', async () => {
    const res = await as(token).put('/api/users/me/password').send({ current_password: 'admin123', new_password: 'nuevaClave99' })
    assert.equal(res.status, 200)
    assert.equal(res.body.user.mustChangePassword, false)
    assert.ok(res.body.token)

    assert.equal((await as(token).get('/api/users/me')).status, 401, 'el token viejo ya no sirve')
    const pets = await as(res.body.token).get('/api/pets')
    assert.equal(pets.status, 200)
    assert.equal(pets.body[0].name, 'Milo')
  })
})

describe('registro y login', () => {
  it('valida usuario y contraseña', async () => {
    assert.equal((await request().post('/api/auth/register').send({ username: 'ab', password: 'password123' })).status, 400)
    assert.equal((await request().post('/api/auth/register').send({ username: 'carla', password: '123' })).status, 400)
  })

  it('crea la cuenta e inicia sesión directamente', async () => {
    const res = await request().post('/api/auth/register').send({ username: 'carla', password: 'password123' })
    assert.equal(res.status, 201)
    assert.equal(res.body.user.mustChangePassword, false)
    assert.match(res.headers['set-cookie'][0], /ph_session=.*HttpOnly/)
  })

  it('rechaza usuarios duplicados', async () => {
    const res = await request().post('/api/auth/register').send({ username: 'carla', password: 'password123' })
    assert.equal(res.status, 409)
  })

  it('credenciales incorrectas → 401', async () => {
    const res = await request().post('/api/auth/login').send({ username: 'carla', password: 'incorrecta' })
    assert.equal(res.status, 401)
  })
})

describe('revocación de sesiones', () => {
  it('"cerrar otras sesiones" invalida los demás tokens pero no el actual', async () => {
    const t1 = await register('dani')
    const t2 = await login('dani', 'password123')

    const res = await as(t1).post('/api/users/me/sessions/revoke')
    assert.equal(res.status, 200)

    assert.equal((await as(t1).get('/api/pets')).status, 401)
    assert.equal((await as(t2).get('/api/pets')).status, 401)
    assert.equal((await as(res.body.token).get('/api/pets')).status, 200)
  })

  it('refresh emite un token válido', async () => {
    const t = await login('carla', 'password123')
    const res = await as(t).post('/api/auth/refresh')
    assert.equal(res.status, 200)
    assert.equal((await as(res.body.token).get('/api/pets')).status, 200)
  })
})
