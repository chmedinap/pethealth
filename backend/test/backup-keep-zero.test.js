const { it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const { setupEnv } = require('./helpers')

// BACKUP_KEEP=0 desactiva los backups automáticos, pero `npm run backup` debe dejar su copia
setupEnv({ BACKUP_KEEP: '0' })
const { runBackup } = require('../src/backup')

it('con BACKUP_KEEP=0 la copia manual no se borra', async () => {
  const dest = await runBackup()
  assert.ok(fs.existsSync(dest))
})
