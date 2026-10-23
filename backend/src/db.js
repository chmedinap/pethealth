const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const { DATA_DIR, DB_PATH } = require('./config')

fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT CHECK(species IN ('cat', 'dog')) NOT NULL,
    breed TEXT,
    birth_date DATE,
    gender TEXT CHECK(gender IN ('male', 'female')),
    weight_kg REAL,
    photo_url TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS checkups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
    vet_name TEXT NOT NULL,
    clinic_name TEXT,
    checkup_date DATE NOT NULL,
    reason TEXT NOT NULL,
    diagnosis TEXT,
    observations TEXT,
    next_visit_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checkup_id INTEGER REFERENCES checkups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    concentration TEXT,
    frequency TEXT NOT NULL,
    duration_days INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
    checkup_id INTEGER REFERENCES checkups(id) ON DELETE SET NULL,
    exam_type TEXT NOT NULL,
    exam_date DATE NOT NULL,
    lab_name TEXT,
    pdf_url TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exam_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    parameter_name TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT,
    reference_range TEXT,
    is_abnormal INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT CHECK(entity_type IN ('checkup', 'exam')) NOT NULL,
    entity_id INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT CHECK(file_type IN ('pdf', 'image')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// ── Migraciones ───────────────────────────────────────────────────────────────
// El esquema de arriba es el original (v0). Cada migración lleva la base a la
// versión siguiente y se registra en PRAGMA user_version. Son idempotentes para
// tolerar bases que ya tenían algún cambio aplicado antes de este sistema.
function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column)
}

const MIGRATIONS = [
  // 1 — mascotas por usuario: las existentes se asignan al primer usuario (admin)
  () => {
    if (hasColumn('pets', 'user_id')) return
    db.exec('ALTER TABLE pets ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE')
    db.exec('UPDATE pets SET user_id = (SELECT MIN(id) FROM users)')
  },

  // 2 — seguridad de cuentas: cambio de contraseña obligatorio y revocación de sesiones
  () => {
    if (!hasColumn('users', 'must_change_password')) {
      db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0')
    }
    if (!hasColumn('users', 'token_version')) {
      db.exec('ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0')
    }
    const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get()
    if (admin && bcrypt.compareSync('admin123', admin.password_hash)) {
      db.prepare('UPDATE users SET must_change_password = 1 WHERE id = ?').run(admin.id)
    }
  },

  // 3 — especies abiertas: SQLite no permite quitar un CHECK, así que se reconstruye
  // la tabla. La lista de especies válidas vive en el código (routes/pets.js).
  () => {
    db.exec(`
      CREATE TABLE pets_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        species TEXT NOT NULL,
        breed TEXT,
        birth_date DATE,
        gender TEXT CHECK(gender IN ('male', 'female')),
        weight_kg REAL,
        photo_url TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO pets_new (id, user_id, name, species, breed, birth_date, gender, weight_kg, photo_url, notes, created_at)
        SELECT id, user_id, name, species, breed, birth_date, gender, weight_kg, photo_url, notes, created_at FROM pets;
      DROP TABLE pets;
      ALTER TABLE pets_new RENAME TO pets;
    `)
  },

  // 4 — historial de peso, vacunas y mascotas compartidas
  () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS weight_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        measured_on DATE NOT NULL,
        weight_kg REAL NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vaccines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        date_given DATE NOT NULL,
        next_due_date DATE,
        vet_name TEXT,
        batch_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pet_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('viewer', 'editor')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pet_id, user_id)
      );

      -- El peso actual de cada mascota pasa a ser el primer punto de su historial
      INSERT INTO weight_logs (pet_id, measured_on, weight_kg)
        SELECT id, date(created_at), weight_kg FROM pets
        WHERE weight_kg IS NOT NULL AND id NOT IN (SELECT pet_id FROM weight_logs);
    `)
  },
]

const currentVersion = db.pragma('user_version', { simple: true })
if (currentVersion < MIGRATIONS.length) {
  // Las reconstrucciones de tablas exigen desactivar las FK (fuera de la transacción)
  db.pragma('foreign_keys = OFF')
  for (let v = currentVersion; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      MIGRATIONS[v]()
      db.pragma(`user_version = ${v + 1}`)
    })()
    console.log(`🔄 Migración ${v + 1} aplicada`)
  }
  const broken = db.pragma('foreign_key_check')
  if (broken.length) console.error('⚠️  Claves foráneas inconsistentes tras migrar:', broken)
  db.pragma('foreign_keys = ON')
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_pets_user ON pets(user_id);
  CREATE INDEX IF NOT EXISTS idx_checkups_pet ON checkups(pet_id);
  CREATE INDEX IF NOT EXISTS idx_exams_pet ON exams(pet_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_weight_logs_pet ON weight_logs(pet_id, measured_on);
  CREATE INDEX IF NOT EXISTS idx_vaccines_pet ON vaccines(pet_id);
  CREATE INDEX IF NOT EXISTS idx_pet_shares_user ON pet_shares(user_id);

  -- attachments es polimórfica (sin FK), así que sus filas se limpian con triggers.
  -- Los triggers también se disparan con los ON DELETE CASCADE desde pets.
  CREATE TRIGGER IF NOT EXISTS trg_checkup_attachments AFTER DELETE ON checkups
  BEGIN
    DELETE FROM attachments WHERE entity_type = 'checkup' AND entity_id = OLD.id;
  END;

  CREATE TRIGGER IF NOT EXISTS trg_exam_attachments AFTER DELETE ON exams
  BEGIN
    DELETE FROM attachments WHERE entity_type = 'exam' AND entity_id = OLD.id;
  END;
`)

// Limpia filas huérfanas que hayan quedado de versiones anteriores
db.exec(`
  DELETE FROM attachments WHERE entity_type = 'checkup' AND entity_id NOT IN (SELECT id FROM checkups);
  DELETE FROM attachments WHERE entity_type = 'exam' AND entity_id NOT IN (SELECT id FROM exams);
`)

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
if (userCount.count === 0) {
  const passwordHash = bcrypt.hashSync('admin123', 10)
  db.prepare('INSERT INTO users (username, password_hash, must_change_password) VALUES (?, ?, 1)').run('admin', passwordHash)
  console.log('⚠️  Usuario por defecto creado: admin / admin123 — se pedirá cambiarla al entrar')
}

// ── Mascotas de demostración (solo en el primer arranque) ─────────────────────
if (userCount.count === 0 && process.env.SEED_DEMO !== 'false') {
  const adminId = db.prepare("SELECT id FROM users WHERE username = 'admin'").get().id
  require('./seed').seedDemo(db, adminId)
}

module.exports = db
