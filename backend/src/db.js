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

// ── Mascota de demostración ───────────────────────────────────────────────────
const petCount = db.prepare('SELECT COUNT(*) as count FROM pets').get()
if (petCount.count === 0 && userCount.count === 0) {
  const adminId = db.prepare("SELECT id FROM users WHERE username = 'admin'").get().id
  db.transaction(() => {

    // Mascota
    const pet = db.prepare(`
      INSERT INTO pets (user_id, name, species, breed, birth_date, gender, weight_kg, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      'Milo',
      'dog',
      'Golden Retriever',
      '2019-06-10',
      'male',
      28.5,
      'Le encanta perseguir pelotas y nadar en el río. Alérgico al pollo — evitar cualquier alimento que lo contenga. Muy sociable con niños y otros perros.'
    )
    const petId = pet.lastInsertRowid

    // ── Checkup 1: Visita de urgencia (más antigua) ───────────────────────────
    const checkup1 = db.prepare(`
      INSERT INTO checkups (pet_id, vet_name, clinic_name, checkup_date, reason, diagnosis, observations, next_visit_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      petId,
      'Ana Rodríguez',
      'Clínica Veterinaria San Francisco',
      '2024-03-20',
      'Vómitos repetidos y letargo desde hace 24 horas',
      'Gastroenteritis aguda. Posible ingesta de algo en mal estado.',
      'Se recomienda dieta blanda por 5 días (arroz hervido y pollo sin piel). Abundante agua. Reposo. Volver si los síntomas persisten más de 48 horas.',
      '2024-04-05'
    )
    const checkup1Id = checkup1.lastInsertRowid

    db.prepare(`INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes) VALUES (?, ?, ?, ?, ?, ?)`).run(
      checkup1Id, 'Metronidazol', '250mg', 'Cada 12 horas', 7, 'Administrar con comida para evitar náuseas'
    )
    db.prepare(`INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes) VALUES (?, ?, ?, ?, ?, ?)`).run(
      checkup1Id, 'Probiótico Fortiflora', null, 'Una vez al día', 14, 'Espolvorear sobre la comida'
    )
    db.prepare(`INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes) VALUES (?, ?, ?, ?, ?, ?)`).run(
      checkup1Id, 'Solución rehidratante oral', null, 'Cada 8 horas', 3, 'Mezclar con agua fresca'
    )

    // ── Checkup 2: Control anual (reciente) ───────────────────────────────────
    const checkup2 = db.prepare(`
      INSERT INTO checkups (pet_id, vet_name, clinic_name, checkup_date, reason, diagnosis, observations, next_visit_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      petId,
      'Carlos Méndez',
      'Clínica Veterinaria San Francisco',
      '2024-11-15',
      'Control anual, vacunación y desparasitación',
      'Estado general bueno. Sobrepeso leve (ideal: 26 kg). Dentadura con acumulación de sarro inicial.',
      'Se recomienda reducir las porciones de concentrado un 15% y aumentar el ejercicio diario. Programar limpieza dental en los próximos 6 meses. Vacunas al día: Séxtuple, Rabia, Bordetella.',
      '2025-05-15'
    )
    const checkup2Id = checkup2.lastInsertRowid

    db.prepare(`INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes) VALUES (?, ?, ?, ?, ?, ?)`).run(
      checkup2Id, 'Bravecto', '1000mg', 'Dosis única', null, 'Antiparasitario externo — protección por 3 meses'
    )
    db.prepare(`INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes) VALUES (?, ?, ?, ?, ?, ?)`).run(
      checkup2Id, 'Milbemax', null, 'Dosis única', null, 'Antiparasitario interno'
    )
    db.prepare(`INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes) VALUES (?, ?, ?, ?, ?, ?)`).run(
      checkup2Id, 'Omega 3 Canino', '1000mg', 'Una vez al día con la comida', 90, 'Para pelaje y articulaciones'
    )

    // ── Examen 1: Bioquímica (visita urgencia) ────────────────────────────────
    const exam1 = db.prepare(`
      INSERT INTO exams (pet_id, checkup_id, exam_type, exam_date, lab_name, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      petId, checkup1Id, 'Bioquímica sérica', '2024-03-20',
      'VetLab Diagnóstico',
      'Muestra tomada en ayuno de 8 horas. Leve elevación de enzimas hepáticas compatible con el cuadro gastrointestinal.'
    )
    const exam1Id = exam1.lastInsertRowid

    const bioValues = [
      ['ALT (Alanina aminotransferasa)', '98',  'U/L',   '10–58',   1],
      ['AST (Aspartato aminotransferasa)', '52', 'U/L',   '15–48',   1],
      ['Glucosa',                          '89', 'mg/dL', '70–110',  0],
      ['BUN (Nitrógeno ureico)',           '18', 'mg/dL', '7–25',    0],
      ['Creatinina',                       '1.1','mg/dL', '0.5–1.5', 0],
      ['Proteínas totales',                '6.8','g/dL',  '5.4–7.5', 0],
      ['Bilirrubina total',                '0.4','mg/dL', '0–0.6',   0],
    ]
    const insertVal = db.prepare(`INSERT INTO exam_values (exam_id, parameter_name, value, unit, reference_range, is_abnormal) VALUES (?, ?, ?, ?, ?, ?)`)
    for (const [param, val, unit, ref, abn] of bioValues) {
      insertVal.run(exam1Id, param, val, unit, ref, abn)
    }

    // ── Examen 2: Hemograma completo (control anual) ──────────────────────────
    const exam2 = db.prepare(`
      INSERT INTO exams (pet_id, checkup_id, exam_type, exam_date, lab_name, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      petId, checkup2Id, 'Hemograma completo', '2024-11-15',
      'VetLab Diagnóstico',
      'Hemograma de rutina en control anual. Resultados dentro de parámetros normales en general.'
    )
    const exam2Id = exam2.lastInsertRowid

    const hemaValues = [
      ['Eritrocitos (Glóbulos rojos)', '6.2',  'x10⁶/µL', '5.5–8.5',   0],
      ['Hemoglobina',                  '15.1', 'g/dL',     '12.0–18.0', 0],
      ['Hematocrito',                  '46',   '%',         '37–55',     0],
      ['VCM',                          '68',   'fL',        '60–77',     0],
      ['Leucocitos (Glóbulos blancos)', '13.2', 'x10³/µL',  '6.0–17.0',  0],
      ['Neutrófilos',                  '78',   '%',         '60–77',     1],
      ['Linfocitos',                   '16',   '%',         '12–30',     0],
      ['Monocitos',                    '5',    '%',         '3–10',      0],
      ['Eosinófilos',                  '1',    '%',         '2–10',      0],
      ['Plaquetas',                    '312',  'x10³/µL',  '200–500',   0],
    ]
    for (const [param, val, unit, ref, abn] of hemaValues) {
      insertVal.run(exam2Id, param, val, unit, ref, abn)
    }

    // ── Vacunas ───────────────────────────────────────────────────────────────
    const insertVaccine = db.prepare(`
      INSERT INTO vaccines (pet_id, name, date_given, next_due_date, vet_name, batch_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertVaccine.run(petId, 'Séxtuple (DHPPi+L)', '2024-11-15', '2025-11-15', 'Carlos Méndez', 'NBV-2291')
    insertVaccine.run(petId, 'Rabia', '2024-11-15', '2027-11-15', 'Carlos Méndez', 'RAB-8812')
    insertVaccine.run(petId, 'Bordetella', '2024-11-15', '2025-11-15', 'Carlos Méndez', null)

    // ── Historial de peso ─────────────────────────────────────────────────────
    const insertWeight = db.prepare('INSERT INTO weight_logs (pet_id, measured_on, weight_kg, notes) VALUES (?, ?, ?, ?)')
    insertWeight.run(petId, '2023-06-12', 27.2, null)
    insertWeight.run(petId, '2024-03-20', 26.8, 'Bajó por la gastroenteritis')
    insertWeight.run(petId, '2024-11-15', 29.1, 'Sobrepeso leve — reducir porciones')
    insertWeight.run(petId, '2025-05-15', 28.5, null)

  })()

  console.log('🐾 Mascota de demostración creada: Milo (Golden Retriever)')
}

module.exports = db
