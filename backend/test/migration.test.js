const { it, before } = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const { setupEnv } = require('./helpers')

// Crea una base con el esquema original (v0): especies con CHECK, sin user_id,
// sin tablas de peso/vacunas/compartir, y el admin con la contraseña por defecto.
const dataDir = setupEnv()
before(() => {
  const old = new Database(path.join(dataDir, 'pethealth.db'))
  old.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE pets (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, species TEXT CHECK(species IN ('cat', 'dog')) NOT NULL, breed TEXT, birth_date DATE, gender TEXT CHECK(gender IN ('male', 'female')), weight_kg REAL, photo_url TEXT, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE checkups (id INTEGER PRIMARY KEY AUTOINCREMENT, pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE, vet_name TEXT NOT NULL, clinic_name TEXT, checkup_date DATE NOT NULL, reason TEXT NOT NULL, diagnosis TEXT, observations TEXT, next_visit_date DATE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  `)
  old.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', bcrypt.hashSync('admin123', 4))
  old.prepare("INSERT INTO pets (name, species, weight_kg, created_at) VALUES ('Milo', 'dog', 28.5, '2024-05-01 10:00:00')").run()
  old.prepare("INSERT INTO checkups (pet_id, vet_name, checkup_date, reason) VALUES (1, 'a', '2024-05-01', 'x')").run()
  old.close()
})

it('migra una base de la versión original sin perder datos', () => {
  const db = require('../src/db')

  assert.equal(db.pragma('user_version', { simple: true }), 5)

  const pet = db.prepare('SELECT * FROM pets').get()
  assert.equal(pet.user_id, 1, 'la mascota se asigna al primer usuario')
  assert.equal(db.prepare('SELECT COUNT(*) c FROM pets').get().c, 1, 'no se vuelve a sembrar la demo')

  const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get()
  assert.equal(admin.must_change_password, 1, 'admin con contraseña por defecto debe cambiarla')

  db.prepare("INSERT INTO pets (user_id, name, species) VALUES (1, 'Copito', 'rabbit')").run()

  const log = db.prepare('SELECT * FROM weight_logs WHERE pet_id = 1').get()
  assert.deepEqual([log.measured_on, log.weight_kg], ['2024-05-01', 28.5])

  // Las FK siguen funcionando tras reconstruir la tabla pets
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1)
  db.prepare('DELETE FROM pets WHERE id = 1').run()
  assert.equal(db.prepare('SELECT COUNT(*) c FROM checkups').get().c, 0)
  assert.equal(db.prepare('SELECT COUNT(*) c FROM weight_logs').get().c, 0)
})
