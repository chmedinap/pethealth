// Generador mínimo de iCalendar (RFC 5545) para el feed de recordatorios.
// Todos los eventos son de día completo: las fechas de la app no tienen hora.

const { addDaysISO } = require('./validate')

const TEXT = {
  es: {
    calendar: 'PetHealth — cuidados',
    visit: 'Visita al veterinario', vaccine: 'Refuerzo de vacuna', parasite: 'Antiparasitario',
    medication: 'Tratamiento', reminder: 'Mañana: {summary}',
    kinds: { internal: 'interno', external: 'externo', combined: 'interno y externo' },
  },
  en: {
    calendar: 'PetHealth — care',
    visit: 'Vet visit', vaccine: 'Vaccine booster', parasite: 'Parasite treatment',
    medication: 'Treatment', reminder: 'Tomorrow: {summary}',
    kinds: { internal: 'internal', external: 'external', combined: 'internal & external' },
  },
}

function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Las líneas no pueden pasar de 75 octetos; se continúan con CRLF + espacio.
// Se corta por caracteres para no partir una secuencia UTF-8 (tildes, emojis).
function fold(line) {
  const out = []
  let current = ''
  let bytes = 0
  for (const ch of line) {
    const size = Buffer.byteLength(ch)
    const limit = out.length === 0 ? 75 : 74 // la continuación ya lleva el espacio inicial
    if (bytes + size > limit) {
      out.push(current)
      current = ''
      bytes = 0
    }
    current += ch
    bytes += size
  }
  out.push(current)
  return out.join('\r\n ')
}

const icsDate = iso => iso.replace(/-/g, '')

function stamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// reminders: salida de listReminders(); appUrl: base para el enlace de cada evento
function buildCalendar(reminders, { lang = 'es', appUrl = '' } = {}) {
  const t = TEXT[lang] || TEXT.es
  const now = stamp()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PetHealth//Tracker//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(t.calendar)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
  ]

  const event = ({ uid, start, end, summary, description, petId, alarm }) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}@pethealth`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${icsDate(start)}`,
      `DTEND;VALUE=DATE:${icsDate(end)}`,
      `SUMMARY:${escapeText(summary)}`,
    )
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`)
    if (appUrl) lines.push(`URL:${appUrl}/pets/${petId}`)
    lines.push('TRANSP:TRANSPARENT')
    if (alarm) {
      // Aviso a las 9:00 del día anterior (el inicio de un evento de día completo es las 00:00)
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(t.reminder.replace('{summary}', summary))}`, 'TRIGGER:-PT15H', 'END:VALARM')
    }
    lines.push('END:VEVENT')
  }

  for (const item of reminders.due) {
    const label = t[item.type]
    const detail = item.type === 'parasite' ? t.kinds[item.detail] : item.detail
    event({
      uid: `${item.type}-${item.ref_id}`,
      start: item.date,
      end: addDaysISO(item.date, 1),
      summary: `${item.pet_name}: ${label} — ${item.title}`,
      description: detail ? `${label}: ${item.title} (${detail})` : `${label}: ${item.title}`,
      petId: item.pet_id,
      alarm: true,
    })
  }

  for (const med of reminders.medications) {
    event({
      uid: `medication-${med.ref_id}`,
      start: med.started_on,
      end: addDaysISO(med.date, 1),
      summary: `${med.pet_name}: ${med.title}${med.concentration ? ` (${med.concentration})` : ''}`,
      description: `${t.medication}: ${med.title} — ${med.frequency}`,
      petId: med.pet_id,
      alarm: false,
    })
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

module.exports = { buildCalendar, escapeText, fold }
