import { describe, it, expect } from 'vitest'
import { parseLabNumber, parseRange, parameterHistory, parameterCounts } from '../labs'

describe('parseLabNumber', () => {
  it.each([
    ['98', 98], ['1,1', 1.1], ['<0.5', 0.5], ['6.2 x10⁶', 6.2], ['-3', -3], ['positivo', null], ['', null],
  ])('%s → %s', (input, expected) => expect(parseLabNumber(input)).toBe(expected))
})

describe('parseRange', () => {
  it.each([
    ['10–58', { min: 10, max: 58 }],
    ['5,4 - 7,5', { min: 5.4, max: 7.5 }],
    ['0.5—1.5', { min: 0.5, max: 1.5 }],
    ['60 a 77', { min: 60, max: 77 }],
    ['<10', null],
    ['58–10', null],
  ])('%s', (input, expected) => expect(parseRange(input)).toEqual(expected))
})

const exams = [
  { exam_date: '2024-11-15', exam_type: 'Hemograma', exam_values: [{ parameter_name: 'ALT', value: '45', is_abnormal: 0 }] },
  { exam_date: '2024-03-20', exam_type: 'Bioquímica', exam_values: [
    { parameter_name: ' alt ', value: '98', unit: 'U/L', reference_range: '10–58', is_abnormal: 1 },
    { parameter_name: 'Glucosa', value: '89' },
  ] },
]

describe('parameterHistory', () => {
  it('agrupa sin distinguir mayúsculas/espacios y ordena por fecha', () => {
    const h = parameterHistory(exams, 'ALT')
    expect(h.map(x => [x.date, x.numeric, x.abnormal])).toEqual([['2024-03-20', 98, true], ['2024-11-15', 45, false]])
  })
  it('cuenta en cuántos exámenes aparece cada parámetro', () => {
    expect(parameterCounts(exams)).toEqual({ alt: 2, glucosa: 1 })
  })
})
