const db = require('./db')

// Cada función devuelve el registro solo si pertenece (vía su mascota) al usuario.
// Devolver undefined para "no existe" y "no es tuyo" evita revelar IDs ajenos.

function getOwnedPet(petId, userId) {
  return db.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ?').get(petId, userId)
}

function getOwnedCheckup(checkupId, userId) {
  return db.prepare(`
    SELECT c.* FROM checkups c
    JOIN pets p ON p.id = c.pet_id
    WHERE c.id = ? AND p.user_id = ?
  `).get(checkupId, userId)
}

function getOwnedExam(examId, userId) {
  return db.prepare(`
    SELECT e.* FROM exams e
    JOIN pets p ON p.id = e.pet_id
    WHERE e.id = ? AND p.user_id = ?
  `).get(examId, userId)
}

function getOwnedMedication(medId, userId) {
  return db.prepare(`
    SELECT m.* FROM medications m
    JOIN checkups c ON c.id = m.checkup_id
    JOIN pets p ON p.id = c.pet_id
    WHERE m.id = ? AND p.user_id = ?
  `).get(medId, userId)
}

function getOwnedExamValue(valueId, userId) {
  return db.prepare(`
    SELECT v.* FROM exam_values v
    JOIN exams e ON e.id = v.exam_id
    JOIN pets p ON p.id = e.pet_id
    WHERE v.id = ? AND p.user_id = ?
  `).get(valueId, userId)
}

function getOwnedAttachment(attId, userId) {
  return db.prepare(`
    SELECT a.* FROM attachments a
    LEFT JOIN checkups c ON a.entity_type = 'checkup' AND c.id = a.entity_id
    LEFT JOIN exams e    ON a.entity_type = 'exam'    AND e.id = a.entity_id
    JOIN pets p ON p.id = COALESCE(c.pet_id, e.pet_id)
    WHERE a.id = ? AND p.user_id = ?
  `).get(attId, userId)
}

// ¿El archivo servido en `fileUrl` pertenece a alguna mascota del usuario?
function userOwnsFile(fileUrl, userId) {
  const row = db.prepare(`
    SELECT 1 FROM pets WHERE photo_url = @url AND user_id = @userId
    UNION ALL
    SELECT 1 FROM exams e JOIN pets p ON p.id = e.pet_id WHERE e.pdf_url = @url AND p.user_id = @userId
    UNION ALL
    SELECT 1 FROM attachments a
      LEFT JOIN checkups c ON a.entity_type = 'checkup' AND c.id = a.entity_id
      LEFT JOIN exams e    ON a.entity_type = 'exam'    AND e.id = a.entity_id
      JOIN pets p ON p.id = COALESCE(c.pet_id, e.pet_id)
      WHERE a.file_url = @url AND p.user_id = @userId
    LIMIT 1
  `).get({ url: fileUrl, userId })
  return !!row
}

module.exports = {
  getOwnedPet,
  getOwnedCheckup,
  getOwnedExam,
  getOwnedMedication,
  getOwnedExamValue,
  getOwnedAttachment,
  userOwnsFile,
}
