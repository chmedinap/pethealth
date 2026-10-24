// Cuántas dosis al día implica una frecuencia escrita a mano ("Cada 8 horas",
// "Dos veces al día", "Twice daily"…). null si no es diaria o no se reconoce:
// en ese caso la app no muestra un objetivo, solo las dosis registradas.
const WORDS = { una: 1, un: 1, uno: 1, once: 1, dos: 2, twice: 2, two: 2, tres: 3, three: 3, thrice: 3, cuatro: 4, four: 4 }

export function dosesPerDay(frequency) {
  const f = String(frequency ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (!f.trim()) return null
  if (/seman|week|mensual|mes\b|month|unica|single|once only|segun|as needed|demanda/.test(f)) return null

  const hours = f.match(/(?:cada|every)\s*(\d+(?:[.,]\d+)?)\s*(?:h|hora|hour)/)
  if (hours) {
    const h = parseFloat(hours[1].replace(',', '.'))
    return h > 0 && h <= 24 ? Math.max(1, Math.floor(24 / h)) : null
  }

  const times = f.match(/(\d+|una|un|uno|dos|tres|cuatro|once|twice|thrice|two|three|four)\s*(?:veces|vez|times|x)?\s*(?:al|a|per|por|each|a)?\s*(?:dia|day|daily)/)
  if (times) return WORDS[times[1]] ?? (parseInt(times[1], 10) || null)
  if (/\b(twice|thrice)\b/.test(f)) return WORDS[f.match(/\b(twice|thrice)\b/)[1]]
  if (/diari|daily|al dia|a day|per day|cada dia|every day/.test(f)) return 1
  return null
}
