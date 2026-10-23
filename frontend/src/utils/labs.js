// Los valores de laboratorio se guardan como texto libre ("1,1", "<0.5", "98 U/L").
// Estas funciones extraen la parte numérica para poder graficarlos.

const NUMBER = '[-+]?\\d+(?:[.,]\\d+)?'

export function parseLabNumber(value) {
  const match = String(value ?? '').match(new RegExp(NUMBER))
  return match ? parseFloat(match[0].replace(',', '.')) : null
}

// "10–58", "10 - 58", "0.5—1.5", "5,4-7,5" → { min, max }
export function parseRange(range) {
  const match = String(range ?? '').match(new RegExp(`(${NUMBER})\\s*(?:[-–—]|a|to)\\s*(${NUMBER})`))
  if (!match) return null
  const min = parseFloat(match[1].replace(',', '.'))
  const max = parseFloat(match[2].replace(',', '.'))
  return min <= max ? { min, max } : null
}

export function normalizeParam(name) {
  return String(name ?? '').trim().toLowerCase()
}

// Serie temporal de un parámetro a lo largo de todos los exámenes, ordenada por fecha
export function parameterHistory(exams, parameterName) {
  const key = normalizeParam(parameterName)
  const rows = []
  for (const exam of exams) {
    for (const v of exam.exam_values || []) {
      if (normalizeParam(v.parameter_name) !== key) continue
      rows.push({
        date: exam.exam_date,
        examType: exam.exam_type,
        value: v.value,
        numeric: parseLabNumber(v.value),
        unit: v.unit,
        range: v.reference_range,
        abnormal: !!v.is_abnormal,
      })
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

// ¿Cuántos exámenes contienen este parámetro? (para saber si vale la pena graficarlo)
export function parameterCounts(exams) {
  const counts = {}
  for (const exam of exams) {
    for (const v of exam.exam_values || []) {
      const key = normalizeParam(v.parameter_name)
      counts[key] = (counts[key] || 0) + 1
    }
  }
  return counts
}
