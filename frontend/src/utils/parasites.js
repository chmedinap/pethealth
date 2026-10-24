import { vaccineStatus } from './vaccines'

export const PARASITE_KINDS = ['internal', 'external', 'combined']

// Mismas reglas que las vacunas: el estado depende solo de next_due_date
export const parasiteStatus = vaccineStatus

// Ids del tratamiento más reciente de cada tipo: solo esos generan recordatorio
export function latestParasiteIds(treatments) {
  const latest = {}
  for (const t of treatments) {
    const cur = latest[t.kind]
    if (!cur || t.date_given > cur.date_given || (t.date_given === cur.date_given && t.id > cur.id)) latest[t.kind] = t
  }
  return new Set(Object.values(latest).map(t => t.id))
}

// 'YYYY-MM-DD' + n meses (el 31 de enero + 1 mes → 28/29 de febrero)
export function addMonths(iso, months) {
  const [y, m, d] = iso.split('-').map(Number)
  const last = new Date(y, m - 1 + months + 1, 0).getDate()
  const date = new Date(y, m - 1 + months, Math.min(d, last))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const COMMON_PARASITE_PRODUCTS = {
  internal: ['Drontal Plus', 'Milbemax', 'Panacur', 'Endogard', 'Total Full'],
  external: ['Bravecto', 'NexGard', 'Simparica', 'Frontline', 'Seresto (collar)', 'Advantix'],
  combined: ['NexGard Spectra', 'Revolution Plus', 'Simparica Trio', 'Bravecto Plus', 'Advocate'],
}
