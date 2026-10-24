const express = require('express')
const { listReminders } = require('../reminders')
const { isISODate, todayISO } = require('../validate')

const router = express.Router()

// GET /api/reminders?today=YYYY-MM-DD&days=30
// `today` lo envía el navegador para usar la fecha local del usuario y no la del servidor.
router.get('/', (req, res) => {
  const today = isISODate(req.query.today) ? req.query.today : todayISO()
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365)
  res.json(listReminders(req.user.id, today, days))
})

module.exports = router
