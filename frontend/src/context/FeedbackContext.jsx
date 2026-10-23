import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import Modal from '../components/Modal'
import { useLanguage } from './LanguageContext'

// Sustituye window.confirm() / alert(): diálogo de confirmación con el Modal del sistema y toasts.
const FeedbackContext = createContext(null)
let toastSeq = 0

export function FeedbackProvider({ children }) {
  const { t } = useLanguage()
  const [dialog, setDialog] = useState(null)
  const [toasts, setToasts] = useState([])
  const resolver = useRef(null)

  const askConfirm = useCallback((message, { title, confirmLabel, danger = true } = {}) =>
    new Promise(resolve => {
      resolver.current = resolve
      setDialog({ message, title, confirmLabel, danger })
    }), [])

  function close(result) {
    resolver.current?.(result)
    resolver.current = null
    setDialog(null)
  }

  const dismiss = useCallback(id => setToasts(list => list.filter(x => x.id !== id)), [])
  const toast = useCallback((message, kind = 'error') => {
    const id = ++toastSeq
    setToasts(list => [...list, { id, message, kind }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  return (
    <FeedbackContext.Provider value={{ askConfirm, toast }}>
      {children}
      {dialog && (
        <Modal title={dialog.title || t.common.confirmTitle} onClose={() => close(false)} closeLabel={t.common.close} size="sm">
          <p className="t-body muted" style={{ margin: '0 0 20px' }}>{dialog.message}</p>
          <div className="modal-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => close(false)}>{t.common.cancel}</button>
            <button className={`btn btn-sm ${dialog.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => close(true)}>
              {dialog.confirmLabel || t.common.confirm}
            </button>
          </div>
        </Modal>
      )}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(x => (
          <div key={x.id} className={`toast toast-${x.kind}`}>
            {x.kind === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span className="toast-msg">{x.message}</span>
            <button className="toast-x" onClick={() => dismiss(x.id)} aria-label={t.common.close}><X size={15} /></button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  return useContext(FeedbackContext)
}
