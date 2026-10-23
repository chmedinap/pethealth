import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// Pila de modales abiertos: Escape solo cierra el de arriba (p. ej. la confirmación
// de "Quitar acceso" se abre encima del diálogo de compartir)
const openStack = []

export default function Modal({ title, subtitle, onClose, closeLabel, size, children }) {
  const ref = useRef(null)
  // onClose suele ser una función inline: se guarda en un ref para que el efecto
  // corra solo al montar (si no, robaría el foco en cada render)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement
    const token = {}
    openStack.push(token)
    ref.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape' && openStack[openStack.length - 1] === token) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      openStack.splice(openStack.indexOf(token), 1)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal${size === 'sm' ? ' modal-sm' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-sm" onClick={onClose} aria-label={closeLabel} title={closeLabel}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
