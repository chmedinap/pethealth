// Una sola línea de tiempo con todo el historial, de lo más reciente a lo más antiguo.
// `tab` indica la pestaña del perfil donde está el detalle de cada evento.
const ORDER = ['checkup', 'exam', 'vaccine', 'parasite', 'weight', 'condition']
export const TIMELINE_TYPES = ORDER

export function buildTimeline({ checkups = [], exams = [], vaccines = [], parasites = [], weights = [], conditions = [] }) {
  const events = [
    ...checkups.map(c => ({ type: 'checkup', id: c.id, date: c.checkup_date, title: c.reason, sub: c.diagnosis || [c.vet_name, c.clinic_name].filter(Boolean).join(' · '), tab: 'checkups' })),
    ...exams.map(e => ({ type: 'exam', id: e.id, date: e.exam_date, title: e.exam_type, sub: e.lab_name, abnormal: (e.exam_values || []).filter(v => v.is_abnormal).length, tab: 'exams' })),
    ...vaccines.map(v => ({ type: 'vaccine', id: v.id, date: v.date_given, title: v.name, sub: v.vet_name, tab: 'vaccines' })),
    ...parasites.map(p => ({ type: 'parasite', id: p.id, date: p.date_given, title: p.product, kind: p.kind, tab: 'parasites' })),
    ...weights.map(w => ({ type: 'weight', id: w.id, date: w.measured_on, value: w.weight_kg, sub: w.notes, tab: 'weight' })),
    ...conditions.filter(c => c.since).map(c => ({ type: 'condition', id: c.id, date: c.since, title: c.name, kind: c.kind, sub: c.notes, tab: null })),
  ]
  return events
    .filter(e => e.date)
    .sort((a, b) => b.date.localeCompare(a.date) || ORDER.indexOf(a.type) - ORDER.indexOf(b.type) || b.id - a.id)
}

// Agrupa por año conservando el orden: [{ year, events }]
export function groupByYear(events) {
  const groups = []
  for (const e of events) {
    const year = e.date.slice(0, 4)
    if (groups.at(-1)?.year !== year) groups.push({ year, events: [] })
    groups.at(-1).events.push(e)
  }
  return groups
}
