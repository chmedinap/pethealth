import { useState } from 'react'
import { ChevronDown, Plus, Undo2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useFeedback } from '../context/FeedbackContext'
import { createDose, deleteDose, getDoses } from '../api'
import { formatDate, nowTime, todayISO } from '../utils/format'

// Resumen e historial de dosis de un medicamento (dentro de la tarjeta de consulta)
export default function MedicationDoses({ medication, canEdit, onChange }) {
  const { t, lang } = useLanguage()
  const tc = t.checkup
  const { askConfirm, toast } = useFeedback()
  const [open, setOpen] = useState(false)
  const [doses, setDoses] = useState(null)
  const [busy, setBusy] = useState(false)

  const count = medication.dose_count || 0
  const when = d => `${formatDate(d.given_on, lang)}${d.given_time ? ` ${d.given_time}` : ''}`
  const lastLabel = medication.last_dose
    ? when({ given_on: medication.last_dose.slice(0, 10), given_time: medication.last_dose.slice(11) })
    : null

  // Recalcula el resumen a partir de la lista (ordenada de la más reciente a la más antigua)
  function report(list) {
    const last = list[0]
    onChange?.({ dose_count: list.length, last_dose: last ? `${last.given_on} ${last.given_time || ''}` : null })
  }

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && !doses) {
      try { setDoses((await getDoses(medication.id)).data) } catch { toast(t.common.error500) }
    }
  }

  async function add() {
    setBusy(true)
    try {
      const res = await createDose(medication.id, { given_on: todayISO(), given_time: nowTime() })
      const list = [res.data, ...(doses || (await getDoses(medication.id)).data.filter(d => d.id !== res.data.id))]
      setDoses(list)
      report(list)
      toast(t.reminders.doseGiven.replace('{name}', medication.name), 'success')
    } catch (err) {
      toast(err.response?.data?.error || t.reminders.doseError)
    } finally {
      setBusy(false)
    }
  }

  async function remove(dose) {
    if (!await askConfirm(tc.deleteDoseConfirm.replace('{date}', when(dose)))) return
    try {
      await deleteDose(dose.id)
      const list = doses.filter(d => d.id !== dose.id)
      setDoses(list)
      report(list)
    } catch {
      toast(t.common.error500)
    }
  }

  if (count === 0 && !canEdit) return null

  return (
    <div className="doses">
      <div className="doses-bar">
        {count > 0 ? (
          <button type="button" className="doses-toggle" onClick={toggle} aria-expanded={open}>
            {tc.dosesCount.replace('{n}', count)}
            {lastLabel && <span className="muted-3"> · {tc.lastDose.replace('{date}', lastLabel)}</span>}
            <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
        ) : <span className="muted-3">{tc.noDoses}</span>}
        {canEdit && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={add} disabled={busy}>
            <Plus size={13} /> {tc.addDose}
          </button>
        )}
      </div>
      {open && doses && (
        <ul className="doses-list" aria-label={tc.dosesHistory}>
          {doses.map(d => (
            <li key={d.id}>
              <span>{when(d)}</span>
              {d.given_by_username && <span className="muted-3">{tc.doseBy.replace('{user}', d.given_by_username)}</span>}
              {canEdit && (
                <button type="button" className="icon-sm" onClick={() => remove(d)} aria-label={tc.deleteDose} title={tc.deleteDose}><Undo2 size={13} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
