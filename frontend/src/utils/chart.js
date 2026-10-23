// Ticks "redondos" (1, 2, 2.5, 5 × 10^n) que cubren [min, max]. Se elige el paso
// que deja entre 4 y 6 marcas, para no estirar el eje mucho más allá de los datos.
export function niceTicks(min, max) {
  if (min === max) { min -= 1; max += 1 }
  const mag = 10 ** Math.floor(Math.log10(max - min))
  const candidates = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5].map(f => f * mag)
  let best = null
  for (const step of candidates) {
    const start = Math.floor(min / step) * step
    const end = Math.ceil(max / step) * step
    const n = Math.round((end - start) / step) + 1
    if (n >= 4 && n <= 6 && (!best || end - start < best.end - best.start)) best = { step, start, end }
  }
  best ??= { step: mag, start: Math.floor(min / mag) * mag, end: Math.ceil(max / mag) * mag }
  const ticks = []
  for (let v = best.start; v <= best.end + best.step / 2; v += best.step) ticks.push(+v.toFixed(10))
  return ticks
}
