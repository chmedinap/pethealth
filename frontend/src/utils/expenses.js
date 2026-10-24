// Gastos de una mascota a partir de los registros que tienen costo
export const EXPENSE_TYPES = ['checkup', 'exam', 'vaccine', 'parasite']

export function collectExpenses({ checkups = [], exams = [], vaccines = [], parasites = [] }) {
  const items = [
    ...checkups.map(c => ({ type: 'checkup', id: c.id, date: c.checkup_date, title: c.reason, cost: c.cost })),
    ...exams.map(e => ({ type: 'exam', id: e.id, date: e.exam_date, title: e.exam_type, cost: e.cost })),
    ...vaccines.map(v => ({ type: 'vaccine', id: v.id, date: v.date_given, title: v.name, cost: v.cost })),
    ...parasites.map(p => ({ type: 'parasite', id: p.id, date: p.date_given, title: p.product, cost: p.cost })),
  ]
  return items
    .filter(i => i.cost != null && i.date)
    .sort((a, b) => b.date.localeCompare(a.date) || EXPENSE_TYPES.indexOf(a.type) - EXPENSE_TYPES.indexOf(b.type))
}

// Suma con centavos enteros para no acumular errores de coma flotante
const sum = values => Math.round(values.reduce((acc, v) => acc + Math.round(v * 100), 0)) / 100

// [{ year, total, byType: { checkup, exam, vaccine, parasite }, count }] del año más reciente al más antiguo
export function expensesByYear(items) {
  const years = {}
  for (const i of items) (years[i.date.slice(0, 4)] ||= []).push(i)
  return Object.entries(years)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, list]) => ({
      year,
      count: list.length,
      total: sum(list.map(i => i.cost)),
      byType: Object.fromEntries(EXPENSE_TYPES.map(t => [t, sum(list.filter(i => i.type === t).map(i => i.cost))])),
    }))
}

export const totalExpenses = items => sum(items.map(i => i.cost))
