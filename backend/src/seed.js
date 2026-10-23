// Datos de demostración que se cargan en el primer arranque (SEED_DEMO=false lo desactiva).
// Las fechas son relativas al día de arranque para que la demo siempre tenga
// recordatorios vencidos y próximos, tratamientos activos y vacunas al día.

function day(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const ago = n => day(-n)
const inDays = n => day(n)

const PETS = [
  {
    // Perro adulto: historial largo, exámenes con un parámetro repetido (gráfica de ALT),
    // próxima visita cercana y una vacuna vencida
    pet: {
      name: 'Milo', species: 'dog', breed: 'Golden Retriever', birth_date: ago(7 * 365 + 130), gender: 'male',
      notes: 'Le encanta perseguir pelotas y nadar en el río. Alérgico al pollo — evitar cualquier alimento que lo contenga. Muy sociable con niños y otros perros.',
    },
    checkups: [
      {
        vet_name: 'Ana Rodríguez', clinic_name: 'Clínica Veterinaria San Francisco', checkup_date: ago(420),
        reason: 'Vómitos repetidos y letargo desde hace 24 horas',
        diagnosis: 'Gastroenteritis aguda. Posible ingesta de algo en mal estado.',
        observations: 'Dieta blanda por 5 días. Abundante agua. Volver si los síntomas persisten más de 48 horas.',
        next_visit_date: ago(405),
        medications: [
          ['Metronidazol', '250mg', 'Cada 12 horas', 7, 'Administrar con comida'],
          ['Probiótico Fortiflora', null, 'Una vez al día', 14, 'Espolvorear sobre la comida'],
        ],
        exams: [{
          exam_type: 'Bioquímica sérica', lab_name: 'VetLab Diagnóstico',
          notes: 'Leve elevación de enzimas hepáticas compatible con el cuadro gastrointestinal.',
          values: [
            ['ALT (Alanina aminotransferasa)', '98', 'U/L', '10–58', 1],
            ['AST (Aspartato aminotransferasa)', '52', 'U/L', '15–48', 1],
            ['Glucosa', '89', 'mg/dL', '70–110', 0],
            ['Creatinina', '1.1', 'mg/dL', '0.5–1.5', 0],
          ],
        }],
      },
      {
        vet_name: 'Carlos Méndez', clinic_name: 'Clínica Veterinaria San Francisco', checkup_date: ago(190),
        reason: 'Control anual, vacunación y desparasitación',
        diagnosis: 'Estado general bueno. Sobrepeso leve (ideal: 26 kg). Sarro dental inicial.',
        observations: 'Reducir porciones un 15% y aumentar el ejercicio diario. Programar limpieza dental.',
        next_visit_date: inDays(12),
        medications: [
          ['Bravecto', '1000mg', 'Dosis única', null, 'Antiparasitario externo — 3 meses'],
          ['Omega 3 Canino', '1000mg', 'Una vez al día', 90, 'Para pelaje y articulaciones'],
        ],
        exams: [{
          exam_type: 'Bioquímica de control', lab_name: 'VetLab Diagnóstico',
          notes: 'Enzimas hepáticas normalizadas.',
          values: [
            ['ALT (Alanina aminotransferasa)', '61', 'U/L', '10–58', 1],
            ['AST (Aspartato aminotransferasa)', '40', 'U/L', '15–48', 0],
            ['Glucosa', '92', 'mg/dL', '70–110', 0],
            ['Creatinina', '1.0', 'mg/dL', '0.5–1.5', 0],
          ],
        }, {
          exam_type: 'Hemograma completo', lab_name: 'VetLab Diagnóstico',
          notes: 'Resultados dentro de parámetros normales en general.',
          values: [
            ['Hemoglobina', '15.1', 'g/dL', '12.0–18.0', 0],
            ['Hematocrito', '46', '%', '37–55', 0],
            ['Leucocitos', '13.2', 'x10³/µL', '6.0–17.0', 0],
            ['Neutrófilos', '78', '%', '60–77', 1],
            ['Plaquetas', '312', 'x10³/µL', '200–500', 0],
          ],
        }],
      },
    ],
    vaccines: [
      ['Séxtuple (DHPPi+L)', ago(190), inDays(175), 'Carlos Méndez', 'NBV-2291'],
      ['Rabia', ago(190), inDays(540), 'Carlos Méndez', 'RAB-8812'],
      ['Bordetella', ago(380), ago(15), 'Ana Rodríguez', null],
    ],
    weights: [[ago(720), 27.2, null], [ago(420), 26.8, 'Bajó por la gastroenteritis'], [ago(190), 29.1, 'Sobrepeso leve — reducir porciones'], [ago(60), 28.3, null], [ago(5), 27.6, null]],
  },
  {
    // Gata: tratamiento en curso tras una consulta reciente, vacuna por vencer
    pet: {
      name: 'Luna', species: 'cat', breed: 'Siamesa', birth_date: ago(3 * 365 + 40), gender: 'female',
      notes: 'Indoor. Muy vocal por las mañanas. Le estresan los viajes en transportín: usar feromonas antes de ir al veterinario.',
    },
    checkups: [
      {
        vet_name: 'Laura Gómez', clinic_name: 'Hospital Felino Gato Feliz', checkup_date: ago(6),
        reason: 'Estornudos y secreción ocular',
        diagnosis: 'Rinotraqueítis leve (herpesvirus felino).',
        observations: 'Limpiar los ojos con suero dos veces al día. Mantener hidratada; ofrecer comida húmeda tibia.',
        next_visit_date: inDays(8),
        medications: [
          ['Doxiciclina', '50mg', 'Cada 24 horas', 14, 'Dar con un poco de comida húmeda'],
          ['L-Lisina', '250mg', 'Dos veces al día', 30, 'En gel'],
        ],
        exams: [],
      },
    ],
    vaccines: [
      ['Triple felina', ago(345), inDays(20), 'Laura Gómez', 'TF-5530'],
      ['Rabia', ago(345), inDays(385), 'Laura Gómez', 'RAB-7741'],
    ],
    weights: [[ago(345), 3.9, null], [ago(160), 4.1, null], [ago(6), 4.0, null]],
  },
  {
    // Conejo: otra especie, revisión dental y vacuna próxima
    pet: {
      name: 'Copito', species: 'rabbit', breed: 'Belier enano', birth_date: ago(2 * 365 + 75), gender: 'male',
      notes: 'Heno ilimitado y verdura fresca a diario. Vigilar el crecimiento de los dientes.',
    },
    checkups: [
      {
        vet_name: 'Martín Ruiz', clinic_name: 'Exóticos VetCare', checkup_date: ago(55),
        reason: 'Revisión dental',
        diagnosis: 'Ligero sobrecrecimiento de molares. Limado sin complicaciones.',
        observations: 'Aumentar la proporción de heno. Revisar en 4 meses.',
        next_visit_date: inDays(65),
        medications: [['Meloxicam', '0.5mg', 'Una vez al día', 3, 'Analgésico post-limado']],
        exams: [],
      },
    ],
    vaccines: [
      ['Mixomatosis', ago(170), inDays(10), 'Martín Ruiz', 'MX-1180'],
      ['Enfermedad hemorrágica vírica (RHD)', ago(170), inDays(195), 'Martín Ruiz', 'RHD-2207'],
    ],
    weights: [[ago(400), 1.6, null], [ago(170), 1.8, null], [ago(55), 1.75, null]],
  },
  {
    // Cachorro: curva de crecimiento, plan de vacunas y un probiótico en curso
    pet: {
      name: 'Rocky', species: 'dog', breed: 'Bulldog francés', birth_date: ago(300), gender: 'male',
      notes: 'Cachorro muy juguetón. Evitar ejercicio intenso con calor (raza braquicéfala).',
    },
    checkups: [
      {
        vet_name: 'Carlos Méndez', clinic_name: 'Clínica Veterinaria San Francisco', checkup_date: ago(120),
        reason: 'Primera consulta y plan de vacunación',
        diagnosis: 'Cachorro sano.',
        observations: 'Iniciar plan de vacunas. Desparasitar cada mes hasta los 6 meses.',
        next_visit_date: ago(90),
        medications: [['Milbemax cachorros', null, 'Dosis única mensual', null, 'Antiparasitario interno']],
        exams: [],
      },
      {
        vet_name: 'Carlos Méndez', clinic_name: 'Clínica Veterinaria San Francisco', checkup_date: ago(18),
        reason: 'Heces blandas tras cambio de alimento',
        diagnosis: 'Disbiosis leve por transición de dieta.',
        observations: 'Hacer la transición de alimento en 7–10 días. Refuerzo de vacuna en 2 semanas.',
        next_visit_date: inDays(3),
        medications: [['Probiótico canino', null, 'Una vez al día', 30, 'Mezclar con la comida']],
        exams: [],
      },
    ],
    vaccines: [
      ['Parvovirus', ago(110), null, 'Carlos Méndez', 'PV-3301'],
      ['Séxtuple (DHPPi+L)', ago(80), inDays(4), 'Carlos Méndez', 'NBV-3390'],
    ],
    weights: [[ago(120), 4.2, 'Primera consulta'], [ago(90), 5.6, null], [ago(60), 7.1, null], [ago(30), 8.4, null], [ago(2), 9.3, null]],
  },
]

function seedDemo(db, userId) {
  const insertPet = db.prepare(`
    INSERT INTO pets (user_id, name, species, breed, birth_date, gender, weight_kg, notes)
    VALUES (@user_id, @name, @species, @breed, @birth_date, @gender, @weight_kg, @notes)
  `)
  const insertCheckup = db.prepare(`
    INSERT INTO checkups (pet_id, vet_name, clinic_name, checkup_date, reason, diagnosis, observations, next_visit_date)
    VALUES (@pet_id, @vet_name, @clinic_name, @checkup_date, @reason, @diagnosis, @observations, @next_visit_date)
  `)
  const insertMed = db.prepare('INSERT INTO medications (checkup_id, name, concentration, frequency, duration_days, notes) VALUES (?, ?, ?, ?, ?, ?)')
  const insertExam = db.prepare('INSERT INTO exams (pet_id, checkup_id, exam_type, exam_date, lab_name, notes) VALUES (?, ?, ?, ?, ?, ?)')
  const insertValue = db.prepare('INSERT INTO exam_values (exam_id, parameter_name, value, unit, reference_range, is_abnormal) VALUES (?, ?, ?, ?, ?, ?)')
  const insertVaccine = db.prepare('INSERT INTO vaccines (pet_id, name, date_given, next_due_date, vet_name, batch_number) VALUES (?, ?, ?, ?, ?, ?)')
  const insertWeight = db.prepare('INSERT INTO weight_logs (pet_id, measured_on, weight_kg, notes) VALUES (?, ?, ?, ?)')

  db.transaction(() => {
    for (const demo of PETS) {
      // pets.weight_kg = el registro de peso más reciente
      const latestWeight = demo.weights[demo.weights.length - 1][1]
      const petId = insertPet.run({ ...demo.pet, user_id: userId, weight_kg: latestWeight }).lastInsertRowid

      for (const { medications, exams, ...checkup } of demo.checkups) {
        const checkupId = insertCheckup.run({ ...checkup, pet_id: petId }).lastInsertRowid
        for (const med of medications) insertMed.run(checkupId, ...med)
        for (const exam of exams) {
          const examId = insertExam.run(petId, checkupId, exam.exam_type, checkup.checkup_date, exam.lab_name, exam.notes).lastInsertRowid
          for (const v of exam.values) insertValue.run(examId, ...v)
        }
      }
      for (const v of demo.vaccines) insertVaccine.run(petId, ...v)
      for (const w of demo.weights) insertWeight.run(petId, ...w)
    }
  })()

  console.log(`🐾 Mascotas de demostración creadas: ${PETS.map(p => p.pet.name).join(', ')}`)
}

module.exports = { seedDemo, DEMO_PET_NAMES: PETS.map(p => p.pet.name) }
