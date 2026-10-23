// Debe coincidir con SPECIES en backend/src/routes/pets.js
export const SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'rodent', 'ferret', 'reptile', 'fish', 'horse', 'other']

const META = {
  dog:     { emoji: '🐶', tint: 'var(--secondary)', badge: 'badge-dog' },
  cat:     { emoji: '🐱', tint: 'var(--accent)',    badge: 'badge-cat' },
  bird:    { emoji: '🐦', tint: 'var(--accent)',    badge: 'badge-cat' },
  rabbit:  { emoji: '🐰', tint: 'var(--secondary)', badge: 'badge-dog' },
  rodent:  { emoji: '🐹', tint: 'var(--secondary)', badge: 'badge-dog' },
  ferret:  { emoji: '🦦', tint: 'var(--secondary)', badge: 'badge-dog' },
  reptile: { emoji: '🦎', tint: 'var(--primary)',   badge: 'badge-primary' },
  fish:    { emoji: '🐠', tint: 'var(--accent)',    badge: 'badge-cat' },
  horse:   { emoji: '🐴', tint: 'var(--secondary)', badge: 'badge-dog' },
  other:   { emoji: '🐾', tint: 'var(--primary)',   badge: 'badge-neutral' },
}

export function speciesMeta(species) {
  return META[species] || META.other
}

// t.species.<key> (singular) y t.speciesPlural.<key> (para los filtros)
export function speciesLabel(species, t, plural = false) {
  const table = plural ? t.speciesPlural : t.species
  return table[species] || table.other
}
