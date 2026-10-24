// Resumen diario de recordatorios por correo (SMTP). Sin SMTP_HOST no hace nada.
const db = require('./db')
const { SMTP, NOTIFY_HOUR, APP_URL } = require('./config')
const { listReminders } = require('./reminders')
const { todayISO } = require('./validate')

// Se avisa solo cuando algo vence en 7 días, mañana u hoy, o venció hace 3 días:
// un correo diario mientras algo siga vencido sería ruido.
const TRIGGER_DAYS = [7, 1, 0, -3]
const WINDOW_DAYS = 7
const CHECK_EVERY_MS = 60 * 60 * 1000

const TEXT = {
  es: {
    subject: 'PetHealth: {n} cuidados pendientes',
    subjectOne: 'PetHealth: 1 cuidado pendiente',
    intro: 'Hola {user}, esto es lo que tienen pendiente tus mascotas:',
    overdue: 'Vencidos', upcoming: 'Próximos 7 días', meds: 'Tratamientos en curso',
    visit: 'Visita', vaccine: 'Vacuna', parasite: 'Antiparasitario',
    today: 'hoy', tomorrow: 'mañana', inDays: 'en {n} días', daysAgo: 'hace {n} días', until: 'hasta el {date}',
    open: 'Abrir PetHealth',
    nothing: 'No hay nada pendiente en los próximos 7 días. 🎉',
    footer: 'Recibes este correo porque activaste los recordatorios en PetHealth. Puedes desactivarlos en "Mi cuenta".',
  },
  en: {
    subject: 'PetHealth: {n} care items due',
    subjectOne: 'PetHealth: 1 care item due',
    intro: 'Hi {user}, here is what your pets have coming up:',
    overdue: 'Overdue', upcoming: 'Next 7 days', meds: 'Ongoing treatments',
    visit: 'Visit', vaccine: 'Vaccine', parasite: 'Parasite treatment',
    today: 'today', tomorrow: 'tomorrow', inDays: 'in {n} days', daysAgo: '{n} days ago', until: 'until {date}',
    open: 'Open PetHealth',
    nothing: 'Nothing due in the next 7 days. 🎉',
    footer: 'You get this email because you turned on reminders in PetHealth. You can turn them off in "My account".',
  },
}

let transport = null
function getTransport() {
  if (transport) return transport
  if (!SMTP.host) return null
  const nodemailer = require('nodemailer')
  transport = nodemailer.createTransport({
    host: SMTP.host,
    port: SMTP.port,
    secure: SMTP.secure,
    auth: SMTP.user ? { user: SMTP.user, pass: SMTP.pass } : undefined,
  })
  return transport
}

// Para los tests: un transporte falso con sendMail()
function setTransport(t) { transport = t }

const emailEnabled = () => !!getTransport()

function daysUntil(today, date) {
  const toUTC = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
  return Math.round((toUTC(date) - toUTC(today)) / 86400000)
}

function shouldNotify(reminders) {
  return reminders.due.some(item => TRIGGER_DAYS.includes(daysUntil(reminders.today, item.date)))
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function formatDay(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' })
}

function buildDigest(user, reminders) {
  const lang = user.lang === 'en' ? 'en' : 'es'
  const t = TEXT[lang]
  const when = date => {
    const n = daysUntil(reminders.today, date)
    if (n === 0) return t.today
    if (n === 1) return t.tomorrow
    return n > 0 ? t.inDays.replace('{n}', n) : t.daysAgo.replace('{n}', -n)
  }
  const line = item => `${item.pet_name} · ${t[item.type]}: ${item.title} — ${formatDay(item.date, lang)} (${when(item.date)})`
  const medLine = m => `${m.pet_name} · ${m.title}${m.concentration ? ` (${m.concentration})` : ''} — ${m.frequency}, ${t.until.replace('{date}', formatDay(m.date, lang))}`

  const overdue = reminders.due.filter(i => i.status === 'overdue')
  const upcoming = reminders.due.filter(i => i.status !== 'overdue')
  const sections = [
    [t.overdue, overdue.map(line)],
    [t.upcoming, upcoming.map(line)],
    [t.meds, reminders.medications.map(medLine)],
  ].filter(([, rows]) => rows.length)

  const count = reminders.due.length
  const subject = count === 1 ? t.subjectOne : t.subject.replace('{n}', count)
  const intro = t.intro.replace('{user}', user.username)

  const text = [
    intro, '',
    ...(sections.length ? sections.flatMap(([title, rows]) => [`${title}:`, ...rows.map(r => `• ${r}`), '']) : [t.nothing, '']),
    APP_URL ? `${t.open}: ${APP_URL}` : null,
    '', t.footer,
  ].filter(l => l !== null).join('\n')

  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;max-width:560px;margin:0 auto;padding:16px">
<h2 style="margin:0 0 8px">🐾 PetHealth</h2>
<p>${escapeHtml(intro)}</p>
${sections.length ? sections.map(([title, rows]) => `<h3 style="margin:18px 0 6px;font-size:15px">${escapeHtml(title)}</h3>
<ul style="padding-left:18px;margin:0">${rows.map(r => `<li style="margin:4px 0">${escapeHtml(r)}</li>`).join('')}</ul>`).join('\n') : `<p>${escapeHtml(t.nothing)}</p>`}
${APP_URL ? `<p style="margin-top:22px"><a href="${escapeHtml(APP_URL)}" style="background:#5b9e7a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(t.open)}</a></p>` : ''}
<p style="margin-top:28px;font-size:12px;color:#888">${escapeHtml(t.footer)}</p>
</body></html>`

  return { subject, text, html }
}

// force: enviar aunque hoy no sea un día de aviso (botón "Enviar prueba")
async function sendDigest(user, today = todayISO(), { force = false } = {}) {
  const t = getTransport()
  if (!t) throw new Error('El correo no está configurado (SMTP_HOST)')
  if (!user.email) throw new Error('El usuario no tiene correo')

  const reminders = listReminders(user.id, today, WINDOW_DAYS)
  if (!force && !shouldNotify(reminders)) return false

  const { subject, text, html } = buildDigest(user, reminders)
  await t.sendMail({ from: SMTP.from, to: user.email, subject, text, html })
  return true
}

// Un intento por usuario y día. Si el envío falla se reintenta en la próxima revisión.
async function runDigests(today = todayISO()) {
  const users = db.prepare(`
    SELECT * FROM users
    WHERE notify_email = 1 AND email IS NOT NULL AND (last_digest_on IS NULL OR last_digest_on < ?)
  `).all(today)
  let sent = 0
  for (const user of users) {
    try {
      if (await sendDigest(user, today)) sent++
      db.prepare('UPDATE users SET last_digest_on = ? WHERE id = ?').run(today, user.id)
    } catch (err) {
      console.error(`❌ Error enviando recordatorios a ${user.username}:`, err.message)
    }
  }
  return sent
}

function startNotifySchedule() {
  if (!emailEnabled()) {
    console.log('   Recordatorios por correo: desactivados (sin SMTP_HOST)')
    return
  }
  console.log(`   Recordatorios por correo: cada día desde las ${NOTIFY_HOUR}:00`)
  const check = () => {
    if (new Date().getHours() < NOTIFY_HOUR) return
    runDigests().then(n => { if (n) console.log(`📧 Recordatorios enviados: ${n}`) })
  }
  check()
  setInterval(check, CHECK_EVERY_MS).unref()
}

module.exports = { emailEnabled, sendDigest, runDigests, buildDigest, shouldNotify, startNotifySchedule, setTransport }
