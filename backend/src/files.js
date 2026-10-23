const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { UPLOADS_DIR } = require('./config')

const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
}
const PDF_TYPES = { 'application/pdf': '.pdf' }

const MB = 1024 * 1024

for (const dir of ['photos', 'pdfs', 'attachments']) {
  fs.mkdirSync(path.join(UPLOADS_DIR, dir), { recursive: true })
}

class UploadError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

// Crea un middleware de multer que guarda en uploads/<subdir> con nombre aleatorio.
// La extensión sale del mimetype validado, nunca del nombre original del archivo.
function createUploader({ subdir, types, maxMb }) {
  return multer({
    storage: multer.diskStorage({
      destination: path.join(UPLOADS_DIR, subdir),
      filename: (req, file, cb) => {
        cb(null, `${crypto.randomBytes(16).toString('hex')}${types[file.mimetype]}`)
      },
    }),
    limits: { fileSize: maxMb * MB, files: 1 },
    fileFilter: (req, file, cb) => {
      if (types[file.mimetype]) return cb(null, true)
      cb(new UploadError('Tipo de archivo no permitido'))
    },
  })
}

const uploadPhoto = createUploader({ subdir: 'photos', types: IMAGE_TYPES, maxMb: 5 })
const uploadPdf = createUploader({ subdir: 'pdfs', types: PDF_TYPES, maxMb: 15 })
const uploadAttachment = createUploader({
  subdir: 'attachments',
  types: { ...IMAGE_TYPES, ...PDF_TYPES },
  maxMb: 10,
})

// Convierte una URL pública (/uploads/...) en ruta absoluta, sin salir de UPLOADS_DIR.
function resolveUploadPath(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) return null
  const abs = path.resolve(UPLOADS_DIR, '.' + fileUrl.slice('/uploads'.length))
  return abs.startsWith(UPLOADS_DIR + path.sep) ? abs : null
}

function removeFile(fileUrl) {
  const abs = resolveUploadPath(fileUrl)
  if (abs) fs.unlink(abs, () => {})
}

function removeFiles(fileUrls) {
  for (const url of fileUrls) removeFile(url)
}

module.exports = {
  uploadPhoto,
  uploadPdf,
  uploadAttachment,
  UploadError,
  resolveUploadPath,
  removeFile,
  removeFiles,
}
