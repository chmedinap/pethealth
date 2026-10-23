import { describe, it, expect } from 'vitest'
import { vaccineStatus, latestDoseIds } from '../vaccines'

const TODAY = '2026-10-22'

describe('vaccineStatus', () => {
  it.each([
    [null, 'none'],
    ['2026-10-21', 'overdue'],
    ['2026-10-22', 'soon'],
    ['2026-11-21', 'soon'],
    ['2026-11-22', 'ok'],
  ])('refuerzo %s → %s', (due, expected) => {
    expect(vaccineStatus({ next_due_date: due }, TODAY)).toBe(expected)
  })
})

describe('latestDoseIds', () => {
  it('se queda con la dosis más reciente de cada vacuna', () => {
    const ids = latestDoseIds([
      { id: 1, name: 'Rabia', date_given: '2023-01-01' },
      { id: 2, name: 'rabia ', date_given: '2024-01-01' },
      { id: 3, name: 'Triple', date_given: '2022-05-01' },
    ])
    expect([...ids].sort()).toEqual([2, 3])
  })
})
