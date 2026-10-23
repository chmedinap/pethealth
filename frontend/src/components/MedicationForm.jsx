import { Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

let draftCounter = 0

// Borrador editable. `id` solo existe para medicamentos ya guardados en el backend.
export function newMedication() {
  return { key: `new-${++draftCounter}`, name: '', concentration: '', frequency: '', duration_days: '', notes: '' }
}

export function toMedicationDraft(med) {
  return {
    key: `med-${med.id}`,
    id: med.id,
    name: med.name || '',
    concentration: med.concentration || '',
    frequency: med.frequency || '',
    duration_days: med.duration_days ?? '',
    notes: med.notes || '',
  }
}

export function medicationPayload(draft) {
  return {
    name: draft.name.trim(),
    concentration: draft.concentration.trim() || null,
    frequency: draft.frequency.trim(),
    duration_days: draft.duration_days === '' ? null : parseInt(draft.duration_days, 10),
    notes: draft.notes.trim() || null,
  }
}

// Devuelve { [key]: { name?, frequency? } } con los errores de cada fila
export function validateMedications(meds, t) {
  const errors = {}
  for (const m of meds) {
    const e = {}
    if (!m.name.trim()) e.name = t.addCheckup.medNameRequired
    if (!m.frequency.trim()) e.frequency = t.addCheckup.medFreqRequired
    if (Object.keys(e).length) errors[m.key] = e
  }
  return errors
}

function Field({ label, error, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {error && <span style={{ fontSize: 12, color: 'var(--danger-ink)', fontWeight: 700 }}>{error}</span>}
    </div>
  )
}

export default function MedicationForm({ medications, onChange, errors = {}, compact = false }) {
  const { t } = useLanguage()
  const tc = t.addCheckup

  function update(key, field, value) {
    onChange(medications.map(m => (m.key === key ? { ...m, [field]: value } : m)))
  }

  return (
    <div>
      {medications.map(m => {
        const err = errors[m.key] || {}
        return (
          <div className={`med-row${compact ? ' compact' : ''}`} key={m.key}>
            <Field label={tc.medName} error={err.name}>
              <input className="input" placeholder={tc.medNamePlaceholder} value={m.name} onChange={e => update(m.key, 'name', e.target.value)} />
            </Field>
            <Field label={tc.medConc}>
              <input className="input" placeholder={tc.medConcPlaceholder} value={m.concentration} onChange={e => update(m.key, 'concentration', e.target.value)} />
            </Field>
            <Field label={tc.medFreq} error={err.frequency}>
              <input className="input" placeholder={tc.medFreqPlaceholder} value={m.frequency} onChange={e => update(m.key, 'frequency', e.target.value)} list="med-freq-options" />
            </Field>
            <button type="button" className="del" onClick={() => onChange(medications.filter(x => x.key !== m.key))} title={tc.medRemove} aria-label={tc.medRemove}>
              <Trash2 size={18} />
            </button>
            <div className="med-extra">
              <Field label={tc.medDays}>
                <input className="input" type="number" min="0" value={m.duration_days} onChange={e => update(m.key, 'duration_days', e.target.value)} />
              </Field>
              <Field label={tc.medNotes}>
                <input className="input" placeholder={tc.medNotesPlaceholder} value={m.notes} onChange={e => update(m.key, 'notes', e.target.value)} />
              </Field>
            </div>
          </div>
        )
      })}

      <datalist id="med-freq-options">
        {tc.freqOptions.map(o => <option key={o} value={o} />)}
      </datalist>

      <button type="button" className="add-med" onClick={() => onChange([...medications, newMedication()])}>
        <Plus size={18} strokeWidth={2.6} /> {tc.medsAdd}
      </button>
    </div>
  )
}
