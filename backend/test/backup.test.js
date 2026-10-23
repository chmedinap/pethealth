const { it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const Database = require('better-sqlite3')
const { setupEnv } = require('./helpers')

setupEnv({ BACKUP_KEEP: '2' })
const { runBackup, listBackups } = require('../src/backup')

it('crea copias legibles y conserva solo las más recientes', async () => {
  const first = await runBackup()
  const copy = new Database(first, { readonly: true })
  assert.equal(copy.prepare("SELECT username FROM users").get().username, 'admin')
  copy.close()

  await runBackup()
  const third = await runBackup()

  const files = listBackups().map(b => b.file)
  assert.equal(files.length, 2)
  assert.ok(files.includes(third))
  assert.ok(!fs.existsSync(first), 'la más antigua se elimina')
})
