import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, subtitle, onClose, closeLabel, children }) {
  const ref = useRef(null)
  // onClose suele ser una función inline: se guarda en un ref para que el efecto
  // corra solo al montar (si no, robaría el foco en cada render)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement
    ref.current?.focus()
    function onKey(e) { if (e.key === 'Escape') onCloseRef.current() }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
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
