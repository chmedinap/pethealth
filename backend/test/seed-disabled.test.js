const { it } = require('node:test')
const assert = require('node:assert/strict')
const { setupEnv } = require('./helpers')

setupEnv({ SEED_DEMO: 'false' })

it('SEED_DEMO=false crea solo el admin, sin mascotas', () => {
  const db = require('../src/db')
  assert.equal(db.prepare('SELECT COUNT(*) c FROM users').get().c, 1)
  assert.equal(db.prepare('SELECT COUNT(*) c FROM pets').get().c, 0)
})
