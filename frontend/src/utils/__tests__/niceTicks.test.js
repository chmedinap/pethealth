import { describe, it, expect } from 'vitest'
import { niceTicks } from '../chart'

describe('niceTicks', () => {
  it('entre 4 y 6 marcas que cubren el rango', () => {
    for (const [min, max] of [[0, 108.6], [26.2, 29.6], [0.4, 1.2], [5, 5.1], [-3, 12]]) {
      const t = niceTicks(min, max)
      expect(t.length).toBeGreaterThanOrEqual(4)
      expect(t.length).toBeLessThanOrEqual(6)
      expect(t[0]).toBeLessThanOrEqual(min)
      expect(t.at(-1)).toBeGreaterThanOrEqual(max)
    }
  })
  it('no inventa negativos para datos positivos', () => {
    expect(niceTicks(0, 108.6)[0]).toBe(0)
  })
})
