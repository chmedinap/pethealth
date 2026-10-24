import { useState } from 'react'
import { AlertTriangle, HeartPulse, Plus, X, Check } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useFeedback } from '../context/FeedbackContext'
import { createCondition, deleteCondition } from '../api'
import { formatDate } from '../utils/format'

const EMPTY = { kind: 'allergy', name: '', since: '', notes: '' }

// Alergias y condiciones crónicas: van arriba en el perfil porque son lo
// primero que necesita saber cualquiera que atienda a la mascota.
export default function ConditionsCard({ pet, conditions, setConditions, canEdit }) {
  const { t, lang } = useLanguage()
  const tc = t.conditions
  const { askConfirm, toast } = useFeedback()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (conditions.length === 0 && !canEdit) return null

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError(tc.required); return }
    setSaving(true)
    setError('')
    try {
      const res = await createCondition(pet.id, form)
      setConditions(prev => [...prev, res.data].sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'allergy' ? -1 : 1)))
      setForm(EMPTY)
      setAdding(false)
    } catch (err) {
      setError(err.response?.data?.error || t.common.error500)
    } finally {
      setSaving(false)
    }
  }

  async function remove(c) {
    if (!await askConfirm(tc.deleteConfirm.replace('{name}', c.name))) return
    try {
      await deleteCondition(c.id)
      setConditions(prev => prev.filter(x => x.id !== c.id))
    } catch {
      toast(t.common.error500)
    }
  }

  const groups = [
    ['allergy', tc.allergies, AlertTriangle],
    ['chronic', tc.chronicMany, HeartPulse],
  ].map(([kind, label, Icon]) => ({ kind, label, Icon, items: conditions.filter(c => c.kind === kind) }))

  return (
    <div className="conditions">
      <div className="conditions-head">
        <span className="t-label muted-3">{tc.title}</span>
        {canEdit && !adding && (
          <button className="icon-sm" onClick={() => setAdding(true)} aria-label={tc.add} title={tc.add}><Plus size={14} /></button>
        )}
      </div>

      {conditions.length === 0 && !adding && <p className="t-bodysm muted" style={{ margin: 0 }}>{tc.none}</p>}

      {groups.filter(g => g.items.length).map(({ kind, label, Icon, items }) => (
        <div key={kind} className="cond-group">
          <div className={`cond-kind cond-${kind}`}><Icon size={13} /> {label}</div>
          <div className="cond-chips">
            {items.map(c => (
              <span key={c.id} className={`cond-chip cond-${kind}`} title={[c.since && `${tc.since} ${formatDate(c.since, lang)}`, c.notes].filter(Boolean).join(' · ') || undefined}>
                {c.name}
                {canEdit && (
                  <button onClick={() => remove(c)} aria-label={`${t.common.delete} ${c.name}`}><X size={12} /></button>
                )}
              </span>
            ))}
          </div>
          {items.some(c => c.notes) && (
            <ul className="cond-notes">
              {items.filter(c => c.notes).map(c => <li key={c.id}><strong>{c.name}:</strong> {c.notes}</li>)}
            </ul>
          )}
        </div>
      ))}

      {adding && (
        <form className="inline-form" style={{ margin: '10px 0 0' }} onSubmit={submit}>
          <div className="fgrid">
            <div className="field">
              <label>{t.parasites.kind}</label>
              <select className="input" value={form.kind} onChange={e => set('kind', e.target.value)}>
                <option value="allergy">{tc.allergy}</option>
                <option value="chronic">{tc.chronic}</option>
              </select>
            </div>
            <div className="field">
              <label>{tc.name} <span className="req">*</span></label>
              <input className="input" autoFocus value={form.name} onChange={e => set('name', e.target.value)}
                placeholder={form.kind === 'allergy' ? tc.namePlaceholderAllergy : tc.namePlaceholderChronic} />
            </div>
            <div className="field">
              <label>{tc.since}</label>
              <input className="input" type="date" value={form.since} onChange={e => set('since', e.target.value)} />
            </div>
            <div className="field">
              <label>{tc.notes}</label>
              <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          {error && <p className="form-error">⚠️ {error}</p>}
          <div className="actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setError(''); setForm(EMPTY) }}><X size={14} /> {t.common.cancel}</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}><Check size={14} /> {saving ? t.common.saving : tc.add}</button>
          </div>
        </form>
      )}
    </div>
  )
}
