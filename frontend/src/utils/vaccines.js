import { todayISO } from './format'

export const DUE_SOON_DAYS = 30

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Estado del refuerzo: 'overdue' | 'soon' | 'ok' | 'none' (sin fecha de refuerzo)
export function vaccineStatus(vaccine, today = todayISO()) {
  if (!vaccine.next_due_date) return 'none'
  if (vaccine.next_due_date < today) return 'overdue'
  if (vaccine.next_due_date <= addDays(today, DUE_SOON_DAYS)) return 'soon'
  return 'ok'
}

// Ids de la dosis más reciente de cada vacuna (por nombre, sin distinguir mayúsculas).
// Solo esas determinan el estado; las anteriores quedan como historial.
export function latestDoseIds(vaccines) {
  const latest = {}
  for (const v of vaccines) {
    const key = v.name.trim().toLowerCase()
    const cur = latest[key]
    if (!cur || v.date_given > cur.date_given || (v.date_given === cur.date_given && v.id > cur.id)) latest[key] = v
  }
  return new Set(Object.values(latest).map(v => v.id))
}

export const COMMON_VACCINES = {
  dog: ['Séxtuple (DHPPi+L)', 'Rabia', 'Bordetella', 'Leptospirosis', 'Parvovirus', 'Moquillo'],
  cat: ['Triple felina', 'Rabia', 'Leucemia felina (FeLV)'],
  rabbit: ['Mixomatosis', 'Enfermedad hemorrágica vírica (RHD)'],
  ferret: ['Moquillo', 'Rabia'],
  horse: ['Influenza equina', 'Tétanos', 'Rabia'],
}
