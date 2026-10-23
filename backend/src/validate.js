// Normaliza '' → null para que los campos opcionales se puedan vaciar
function clean(value) {
  return value === '' || value === undefined ? null : value
}

// 'YYYY-MM-DD' que además sea una fecha real (rechaza 2024-02-31)
function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

function isBlank(value) {
  return value == null || !String(value).trim()
}

// Fecha local del servidor en formato ISO (respeta la variable TZ del contenedor)
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

module.exports = { clean, isISODate, isBlank, todayISO }
