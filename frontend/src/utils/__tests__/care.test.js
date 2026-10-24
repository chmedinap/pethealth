import { describe, it, expect } from 'vitest'
import { dosesPerDay } from '../medications'
import { latestParasiteIds, addMonths } from '../parasites'
import { collectExpenses, expensesByYear, totalExpenses } from '../expenses'
import { buildTimeline, groupByYear } from '../timeline'
import { formatMoney } from '../format'

describe('dosesPerDay', () => {
  it.each([
    ['Una vez al día', 1], ['Dos veces al día', 2], ['3 veces al dia', 3], ['Cada 8 horas', 3],
    ['Cada 12 horas', 2], ['Cada 24 horas', 1], ['cada 6h', 4], ['Diaria', 1], ['Dosis diaria', 1],
    ['Once a day', 1], ['Twice daily', 2], ['Every 12 hours', 2],
    ['Semanal', null], ['Mensual', null], ['Dosis única', null], ['Dosis única mensual', null],
    ['Según indicación', null], ['', null], [null, null],
  ])('%s → %s', (input, expected) => expect(dosesPerDay(input)).toBe(expected))
})

describe('antiparasitarios', () => {
  it('el último de cada tipo es el vigente', () => {
    const list = [
      { id: 1, kind: 'internal', date_given: '2025-01-01' },
      { id: 2, kind: 'internal', date_given: '2025-03-01' },
      { id: 3, kind: 'external', date_given: '2024-12-01' },
    ]
    expect([...latestParasiteIds(list)].sort()).toEqual([2, 3])
  })

  it('suma meses sin desbordar el fin de mes', () => {
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28')
    expect(addMonths('2024-11-15', 3)).toBe('2025-02-15')
  })
})

describe('gastos', () => {
  const data = {
    checkups: [{ id: 1, checkup_date: '2025-02-01', reason: 'Control', cost: 40.1 }, { id: 2, checkup_date: '2025-03-01', reason: 'Sin costo', cost: null }],
    exams: [{ id: 1, exam_date: '2024-05-01', exam_type: 'Hemograma', cost: 30 }],
    vaccines: [{ id: 1, date_given: '2025-02-01', name: 'Rabia', cost: 20.2 }],
    parasites: [{ id: 1, date_given: '2025-06-01', product: 'Bravecto', cost: 0 }],
  }

  it('reúne solo los registros con costo, más recientes primero', () => {
    const items = collectExpenses(data)
    expect(items.map(i => `${i.type}-${i.id}`)).toEqual(['parasite-1', 'checkup-1', 'vaccine-1', 'exam-1'])
    expect(totalExpenses(items)).toBe(90.3)
  })

  it('agrupa por año y por tipo sin errores de redondeo', () => {
    const [y2025, y2024] = expensesByYear(collectExpenses(data))
    expect(y2025).toMatchObject({ year: '2025', total: 60.3, count: 3, byType: { checkup: 40.1, vaccine: 20.2, exam: 0, parasite: 0 } })
    expect(y2024).toMatchObject({ year: '2024', total: 30 })
  })

  it('formatea la moneda', () => {
    expect(formatMoney(1234.5, 'USD', 'en')).toBe('$1,234.50')
    expect(formatMoney(20, 'USD', 'en')).toBe('$20')
    expect(formatMoney(null)).toBeNull()
  })
})

describe('línea de tiempo', () => {
  it('ordena todo junto y agrupa por año', () => {
    const events = buildTimeline({
      checkups: [{ id: 1, checkup_date: '2025-01-10', reason: 'Control' }],
      exams: [{ id: 1, exam_date: '2025-01-10', exam_type: 'Hemograma', exam_values: [{ is_abnormal: 1 }] }],
      weights: [{ id: 1, measured_on: '2024-12-01', weight_kg: 4 }],
      conditions: [{ id: 1, name: 'Pollo', kind: 'allergy', since: '2023-02-01' }, { id: 2, name: 'Sin fecha', kind: 'chronic', since: null }],
    })
    expect(events.map(e => e.type)).toEqual(['checkup', 'exam', 'weight', 'condition'])
    expect(events[1].abnormal).toBe(1)
    expect(groupByYear(events).map(g => [g.year, g.events.length])).toEqual([['2025', 2], ['2024', 1], ['2023', 1]])
  })
})
