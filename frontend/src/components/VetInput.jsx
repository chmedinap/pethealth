import { useEffect, useId, useState } from 'react'
import { getVets } from '../api'

// El directorio se pide una vez por carga de página y se comparte entre formularios
let cache = null
export function invalidateVetCache() { cache = null }

export function useVets() {
  const [vets, setVets] = useState(() => (Array.isArray(cache) ? cache : []))
  useEffect(() => {
    if (Array.isArray(cache)) return
    cache ??= getVets().then(res => { cache = res.data; return res.data }).catch(() => { cache = null; return [] })
    Promise.resolve(cache).then(setVets)
  }, [])
  return vets
}

// Campo de veterinario con sugerencias del directorio. Al elegir uno conocido
// se avisa con onPick(vet) para completar la clínica.
export default function VetInput({ value, onChange, onPick, className = 'input', style, placeholder }) {
  const vets = useVets()
  const listId = useId()

  function handleChange(next) {
    onChange(next)
    const vet = vets.find(v => v.name.toLowerCase() === next.trim().toLowerCase())
    if (vet && onPick) onPick(vet)
  }

  return (
    <>
      <input className={className} style={style} value={value} placeholder={placeholder} list={listId} onChange={e => handleChange(e.target.value)} autoComplete="off" />
      <datalist id={listId}>
        {vets.map(v => <option key={v.id} value={v.name}>{v.clinic || ''}</option>)}
      </datalist>
    </>
  )
}
