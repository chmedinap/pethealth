const { it } = require('node:test')
const assert = require('node:assert/strict')
const { setupEnv, client } = require('./helpers')

setupEnv({ LOGIN_RATE_LIMIT: '3' })
const app = require('../src/app')
const { request, register } = client(app)

it('bloquea el login tras varios intentos fallidos desde la misma IP', async () => {
  await register('eva')
  const attempt = password => request().post('/api/auth/login').send({ username: 'eva', password })

  // Los logins correctos no cuentan para el límite
  for (let i = 0; i < 3; i++) assert.equal((await attempt('password123')).status, 200)

  for (let i = 0; i < 3; i++) assert.equal((await attempt('mala')).status, 401)
  const blocked = await attempt('mala')
  assert.equal(blocked.status, 429)
  assert.match(blocked.body.error, /Demasiados intentos/)

  // Mientras dure la ventana, incluso la contraseña correcta queda bloqueada
  assert.equal((await attempt('password123')).status, 429)
})
