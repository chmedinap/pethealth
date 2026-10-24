const express = require('express')
const db = require('../db')
const { listReminders } = require('../reminders')
const { buildCalendar } = require('../ics')
const { todayISO } = require('../validate')
const { APP_URL } = require('../config')

// Feed iCalendar público: las apps de calendario no envían headers de
// autenticación, así que el acceso es por un token secreto en la URL
// (se puede regenerar o desactivar desde "Mi cuenta").
const router = express.Router()

// Ventana del feed: todo lo vencido y lo que viene en el próximo año
const FEED_DAYS = 365

// GET /api/calendar/:token.ics
router.get('/:file', (req, res) => {
  const match = /^([a-f0-9]{48})\.ics$/.exec(req.params.file)
  const user = match && db.prepare('SELECT id, lang FROM users WHERE calendar_token = ?').get(match[1])
  if (!user) return res.status(404).type('text/plain').send('Calendario no encontrado')

  const reminders = listReminders(user.id, todayISO(), FEED_DAYS)
  const appUrl = APP_URL || `${req.protocol}://${req.get('host')}`
  res.set('Content-Type', 'text/calendar; charset=utf-8')
  res.set('Cache-Control', 'no-cache')
  res.set('Content-Disposition', 'inline; filename="pethealth.ics"')
  res.send(buildCalendar(reminders, { lang: user.lang, appUrl }))
})

module.exports = router
