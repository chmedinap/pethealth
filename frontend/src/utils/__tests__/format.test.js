import { describe, it, expect, vi, afterEach } from 'vitest'
import { calcAge, formatDate, relativeDate, todayISO } from '../format'

const tc = { unknownAge: '?', year: 'año', years: 'años', month: 'mes', months: 'meses', and: 'y' }

afterEach(() => vi.useRealTimers())

describe('formatDate', () => {
  it('interpreta la fecha como local (sin desfase de zona horaria)', () => {
    expect(formatDate('2024-11-15', 'es')).toBe('15/11/2024')
    expect(formatDate('2024-11-15 23:59:00', 'en')).toBe('11/15/2024')
  })
  it('devuelve null con fechas vacías o inválidas', () => {
    expect(formatDate(null)).toBeNull()
    expect(formatDate('ayer')).toBeNull()
  })
})

describe('calcAge', () => {
  it('cuenta años y meses completos', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 22) })
    expect(calcAge('2019-06-10', tc)).toBe('7 años y 4 meses')
    expect(calcAge('2026-03-22', tc)).toBe('7 meses')
    expect(calcAge('2025-10-22', tc)).toBe('1 año')
  })
  it('no cuenta el mes si aún no llegó el día', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 5) })
    // Del 10/10/2025 al 05/10/2026 faltan 5 días para cumplir el año
    expect(calcAge('2025-10-10', tc)).toBe('11 meses')
  })
  it('fechas futuras o vacías → edad desconocida', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 22) })
    expect(calcAge('2030-01-01', tc)).toBe('?')
    expect(calcAge('', tc)).toBe('?')
  })
})

describe('relativeDate', () => {
  it('redondea a la unidad más cercana', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 22, 15) })
    expect(relativeDate('2026-10-21', 'en')).toBe('yesterday')
    expect(relativeDate('2024-11-15', 'en')).toBe('2 years ago')
    expect(relativeDate('2026-11-05', 'en')).toBe('in 2 weeks')
  })
})

describe('todayISO', () => {
  it('usa la fecha local, no UTC', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 22, 23, 30) })
    expect(todayISO()).toBe('2026-10-22')
  })
})
