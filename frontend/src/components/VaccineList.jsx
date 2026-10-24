import { useEffect, useState } from 'react'
import { Pencil, Trash2, Syringe, AlertTriangle, Clock, CheckCircle2, Check, X } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { createVaccine, updateVaccine, deleteVaccine } from '../api'
import { formatDate, formatMoney, todayISO } from '../utils/format'
import { useAuth } from '../context/AuthContext'
import VetInput from './VetInput'
import { vaccineStatus, latestDoseIds, COMMON_VACCINES } from '../utils/vaccines'
import { useFeedback } from '../context/FeedbackContext'

const EMPTY = { name: '', date_given: '', next_due_date: '', vet_name: '', batch_number: '', notes: '', cost: '' }

function StatusPill({ status, t }) {
  const tv = t.vaccines
  if (status === 'overdue') return <span className="status status-overdue"><AlertTriangle size={12} /> {tv.statusOverdue}</span>
  if (status === 'soon') return <span className="status status-soon"><Clock size={12} /> {tv.statusSoon}</span>
  if (status === 'ok') return <span className="status status-ok"><CheckCircle2 size={12} /> {tv.statusOk}</span>
  return <span className="status status-muted">{tv.statusNone}</span>
}

function VaccineForm({ initial, species, onSave, onCancel, t }) {
  const tv = t.vaccines
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.date_given) { setError(tv.required); return }
    if (form.next_due_date && form.next_due_date < form.date_given) { setError(tv.dueBeforeGiven); return }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err) {
      setError(err.response?.data?.error || t.common.error500)
      setSaving(false)
    }
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <div className="fgrid">
        <div className="field">
          <label>{tv.name} <span className="req">*</span></label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} list="vaccine-names" placeholder={tv.namePlaceholder} />
          <datalist id="vaccine-names">
            {(COMMON_VACCINES[species] || []).map(n => <option key={n} value={n} />)}
          </datalist>
        </div>
        <div className="field">
          <label>{tv.vet}</label>
          <VetInput value={form.vet_name} onChange={v => set('vet_name', v)} />
        </div>
        <div className="field">
          <label>{tv.dateGiven} <span className="req">*</span></label>
          <input className="input" type="date" value={form.date_given} onChange={e => set('date_given', e.target.value)} />
        </div>
        <div className="field">
          <label>{tv.nextDue}</label>
          <input className="input" type="date" value={form.next_due_date} min={form.date_given || undefined} onChange={e => set('next_due_date', e.target.value)} />
        </div>
        <div className="field">
          <label>{tv.batch}</label>
          <input className="input" value={form.batch_number} onChange={e => set('batch_number', e.target.value)} />
        </div>
        <div className="field">
          <label>{t.common.cost}</label>
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" placeholder={t.common.costPlaceholder} value={form.cost} onChange={e => set('cost', e.target.value)} />
        </div>
        <div className="field">
          <label>{tv.notes}</label>
          <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
      {error && <p className="form-error">⚠️ {error}</p>}
      <div className="actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}><X size={14} /> {t.common.cancel}</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}><Check size={14} /> {saving ? t.common.saving : t.checkup.saveBtn}</button>
      </div>
    </form>
  )
}

export default function VaccineList({ pet, vaccines, setVaccines, canEdit, addRequest = 0 }) {
  const { t, lang } = useLanguage()
  const { askConfirm, toast } = useFeedback()
  const { user } = useAuth()
  const tv = t.vaccines
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // El botón «Registrar vacuna» vive en la cabecera de pestañas (PetProfile)
  useEffect(() => {
    if (addRequest > 0 && canEdit) { setAdding(true); setEditingId(null) }
  }, [addRequest, canEdit])

  const sorted = [...vaccines].sort((a, b) => b.date_given.localeCompare(a.date_given) || b.id - a.id)
  const latest = latestDoseIds(vaccines)

  async function handleCreate(form) {
    const res = await createVaccine(pet.id, form)
    setVaccines(prev => [res.data, ...prev])
    setAdding(false)
  }

  async function handleUpdate(id, form) {
    const res = await updateVaccine(id, form)
    setVaccines(prev => prev.map(v => (v.id === id ? res.data : v)))
    setEditingId(null)
  }

  async function handleDelete(v) {
    if (!await askConfirm(tv.deleteConfirm.replace('{name}', v.name))) return
    try {
      await deleteVaccine(v.id)
      setVaccines(prev => prev.filter(x => x.id !== v.id))
    } catch {
      toast(t.common.error500)
    }
  }

  const toForm = v => ({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map(k => [k, v[k] ?? ''])) })

  return (
    <div className="panel-card">
      {adding && (
        <VaccineForm initial={{ ...EMPTY, date_given: todayISO() }} species={pet.species} onSave={handleCreate} onCancel={() => setAdding(false)} t={t} />
      )}

      {sorted.length === 0 && !adding ? (
        <div className="section-empty">
          <span className="se-emoji">💉</span>
          <h3 className="t-h3" style={{ margin: '0 0 6px' }}>{tv.emptyTitle}</h3>
          <p className="t-bodysm" style={{ margin: 0 }}>{tv.emptySub}</p>
        </div>
      ) : (
        <ul className="row-list">
          {sorted.map(v => (
            editingId === v.id ? (
              <li key={v.id} style={{ paddingTop: 12 }}>
                <VaccineForm initial={toForm(v)} species={pet.species} onSave={form => handleUpdate(v.id, form)} onCancel={() => setEditingId(null)} t={t} />
              </li>
            ) : (
              <li className="row-item" key={v.id}>
                <div className="rem-ic vaccine"><Syringe size={17} /></div>
                <div className="grow">
                  <div className="name">{v.name}</div>
                  <div className="meta">
                    {tv.given} {formatDate(v.date_given, lang)}
                    {v.next_due_date && <> · {tv.nextDueShort} {formatDate(v.next_due_date, lang)}</>}
                    {v.vet_name && <> · {v.vet_name}</>}
                    {v.batch_number && <> · {tv.batchShort} {v.batch_number}</>}
                    {v.cost != null && <> · {formatMoney(v.cost, user?.currency, lang)}</>}
                  </div>
                  {v.notes && <div className="meta">{v.notes}</div>}
                </div>
                {latest.has(v.id)
                  ? <StatusPill status={vaccineStatus(v)} t={t} />
                  : <span className="status status-muted">{tv.previousDose}</span>}
                {canEdit && (
                  <div className="row-actions">
                    <button className="icon-sm" onClick={() => { setEditingId(v.id); setAdding(false) }} aria-label={t.checkup.editBtn} title={t.checkup.editBtn}><Pencil size={14} /></button>
                    <button className="icon-sm danger" onClick={() => handleDelete(v)} aria-label={tv.delete} title={tv.delete}><Trash2 size={14} /></button>
                  </div>
                )}
              </li>
            )
          ))}
        </ul>
      )}
    </div>
  )
}
