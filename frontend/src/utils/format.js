const LOCALES = { es: 'es-ES', en: 'en-US' }

// Las fechas vienen como 'YYYY-MM-DD' o 'YYYY-MM-DD HH:MM:SS' (SQLite).
// Se interpretan como fecha local: new Date('2024-11-15') sería UTC y podría
// mostrarse como el día anterior en zonas horarias negativas.
function parseDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function formatDate(dateStr, lang = 'es') {
  const date = parseDate(dateStr)
  if (!date) return null
  return date.toLocaleDateString(LOCALES[lang] || LOCALES.es, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function relativeDate(dateStr, lang = 'es') {
  const date = parseDate(dateStr)
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((date - today) / 86400000)
  const rtf = new Intl.RelativeTimeFormat(LOCALES[lang] || LOCALES.es, { numeric: 'auto' })
  const abs = Math.abs(days)
  if (abs < 7) return rtf.format(days, 'day')
  if (abs < 30) return rtf.format(Math.round(days / 7), 'week')
  if (abs < 365) return rtf.format(Math.round(days / 30), 'month')
  return rtf.format(Math.round(days / 365), 'year')
}

export function calcAge(birthDate, tc) {
  const birth = parseDate(birthDate)
  if (!birth) return tc.unknownAge
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (now.getDate() < birth.getDate()) months--
  if (months < 0) { years--; months += 12 }
  if (years < 0) return tc.unknownAge
  if (years === 0) return `${months} ${months === 1 ? tc.month : tc.months}`
  if (months === 0) return `${years} ${years === 1 ? tc.year : tc.years}`
  return `${years} ${years === 1 ? tc.year : tc.years} ${tc.and} ${months} ${months === 1 ? tc.month : tc.months}`
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// navigator.clipboard solo existe en contextos seguros (HTTPS o localhost).
// En una instalación self-hosted servida por HTTP en la red local se usa execCommand.
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(el)
  if (!ok) throw new Error('copy failed')
}

// Hora local 'HH:MM' (para registrar dosis)
export function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 1234.5 → "$1,234.50" / "1.234,50 €" según idioma y moneda. Sin decimales si es entero.
export function formatMoney(amount, currency = 'USD', lang = 'es') {
  if (amount == null || amount === '') return null
  const n = Number(amount)
  try {
    return n.toLocaleString(LOCALES[lang] || LOCALES.es, {
      style: 'currency', currency, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2,
    })
  } catch {
    return `${n.toFixed(2)} ${currency}`
  }
}
