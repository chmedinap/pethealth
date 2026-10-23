const fs = require('fs')
const os = require('os')
const path = require('path')

// Debe llamarse ANTES de requerir la app: config y db leen el entorno al cargarse.
// node --test ejecuta cada archivo en su propio proceso, así que cada uno tiene su base.
function setupEnv(extra = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pethealth-test-'))
  Object.assign(process.env, {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    DATA_DIR: dataDir,
    ALLOW_REGISTRATION: 'true',
    LOGIN_RATE_LIMIT: '0',
    ...extra,
  })
  return dataDir
}

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
const PDF = Buffer.from('%PDF-1.4\n%%EOF')

function client(app) {
  const request = require('supertest')

  async function register(username, password = 'password123') {
    const res = await request(app).post('/api/auth/register').send({ username, password })
    if (res.status !== 201) throw new Error(`register ${username}: ${res.status} ${JSON.stringify(res.body)}`)
    return res.body.token
  }

  async function login(username, password) {
    const res = await request(app).post('/api/auth/login').send({ username, password })
    if (res.status !== 200) throw new Error(`login ${username}: ${res.status}`)
    return res.body.token
  }

  // Acceso como un usuario: as(token).get('/api/pets')
  function as(token) {
    const wrap = method => url => request(app)[method](url).set('Authorization', `Bearer ${token}`)
    return { get: wrap('get'), post: wrap('post'), put: wrap('put'), delete: wrap('delete') }
  }

  async function createPet(token, data = {}) {
    const res = await as(token).post('/api/pets').send({ name: 'Kira', species: 'cat', ...data })
    if (res.status !== 201) throw new Error(`createPet: ${res.status} ${JSON.stringify(res.body)}`)
    return res.body
  }

  return { request: () => request(app), register, login, as, createPet }
}

module.exports = { setupEnv, client, PNG, PDF }
