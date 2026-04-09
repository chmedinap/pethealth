const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const fs = require('fs')

fs.mkdirSync('/app/data', { recursive: true })

const db = new Database('/app/data/pethealth.db')

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
`)

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
if (userCount.count === 0) {
  const passwordHash = bcrypt.hashSync('admin123', 10)
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', passwordHash)
  console.log('⚠️  Usuario por defecto creado: admin / admin123 — ¡cámbialo pronto!')
}

// ── Mascota de demostración ───────────────────────────────────────────────────
const petCount = db.prepare('SELECT COUNT(*) as count FROM pets').get()
if (petCount.count === 0) {
  db.transaction(() => {

    // Mascota
    const pet = db.prepare(`
      INSERT INTO pets (name, species, breed, birth_date, gender, weight_kg, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
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

  })()

  console.log('🐾 Mascota de demostración creada: Milo (Golden Retriever)')
}

module.exports = db
