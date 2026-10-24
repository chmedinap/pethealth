import { useEffect, useState } from 'react'
import { Pencil, Trash2, Bug, AlertTriangle, Clock, CheckCircle2, Check, X } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useFeedback } from '../context/FeedbackContext'
import { createParasite, updateParasite, deleteParasite } from '../api'
import { formatDate, formatMoney, todayISO } from '../utils/format'
import { PARASITE_KINDS, COMMON_PARASITE_PRODUCTS, parasiteStatus, latestParasiteIds, addMonths } from '../utils/parasites'

const EMPTY = { kind: 'internal', product: '', date_given: '', next_due_date: '', cost: '', notes: '' }

function StatusPill({ status, t }) {
  const tv = t.vaccines
  if (status === 'overdue') return <span className="status status-overdue"><AlertTriangle size={12} /> {tv.statusOverdue}</span>
  if (status === 'soon') return <span className="status status-soon"><Clock size={12} /> {tv.statusSoon}</span>
  if (status === 'ok') return <span className="status status-ok"><CheckCircle2 size={12} /> {tv.statusOk}</span>
  return <span className="status status-muted">{tv.statusNone}</span>
}

function ParasiteForm({ initial, onSave, onCancel, t }) {
  const tp = t.parasites
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.product.trim() || !form.date_given) { setError(tp.required); return }
    if (form.next_due_date && form.next_due_date < form.date_given) { setError(tp.dueBeforeGiven); return }
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
          <label>{tp.kind} <span className="req">*</span></label>
          <select className="input" value={form.kind} onChange={e => set('kind', e.target.value)}>
            {PARASITE_KINDS.map(k => <option key={k} value={k}>{tp.kinds[k]}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{tp.product} <span className="req">*</span></label>
          <input className="input" value={form.product} onChange={e => set('product', e.target.value)} list={`parasite-products-${form.kind}`} placeholder={tp.productPlaceholder} />
          <datalist id={`parasite-products-${form.kind}`}>
            {COMMON_PARASITE_PRODUCTS[form.kind].map(n => <option key={n} value={n} />)}
          </datalist>
        </div>
        <div className="field">
          <label>{tp.dateGiven} <span className="req">*</span></label>
          <input className="input" type="date" value={form.date_given} onChange={e => set('date_given', e.target.value)} />
        </div>
        <div className="field">
          <label>{tp.nextDue}</label>
          <input className="input" type="date" value={form.next_due_date} min={form.date_given || undefined} onChange={e => set('next_due_date', e.target.value)} />
          {form.date_given && (
            <span className="quick-picks">
              {tp.quickNext}
              {[[1, tp.months1], [3, tp.months3], [6, tp.months6]].map(([n, label]) => (
                <button type="button" key={n} className="chip chip-xs" onClick={() => set('next_due_date', addMonths(form.date_given, n))}>{label}</button>
              ))}
            </span>
          )}
        </div>
        <div className="field">
          <label>{t.common.cost}</label>
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" placeholder={t.common.costPlaceholder} value={form.cost} onChange={e => set('cost', e.target.value)} />
        </div>
        <div className="field">
          <label>{tp.notes}</label>
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

export default function ParasiteList({ pet, parasites, setParasites, canEdit, addRequest = 0 }) {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const { askConfirm, toast } = useFeedback()
  const tp = t.parasites
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // El botón «Registrar antiparasitario» vive en la cabecera de pestañas (PetProfile)
  useEffect(() => {
    if (addRequest > 0 && canEdit) { setAdding(true); setEditingId(null) }
  }, [addRequest, canEdit])

  const sorted = [...parasites].sort((a, b) => b.date_given.localeCompare(a.date_given) || b.id - a.id)
  const latest = latestParasiteIds(parasites)

  async function handleCreate(form) {
    const res = await createParasite(pet.id, form)
    setParasites(prev => [res.data, ...prev])
    setAdding(false)
  }

  async function handleUpdate(id, form) {
    const res = await updateParasite(id, form)
    setParasites(prev => prev.map(p => (p.id === id ? res.data : p)))
    setEditingId(null)
  }

  async function handleDelete(p) {
    if (!await askConfirm(tp.deleteConfirm.replace('{name}', p.product))) return
    try {
      await deleteParasite(p.id)
      setParasites(prev => prev.filter(x => x.id !== p.id))
    } catch {
      toast(t.common.error500)
    }
  }

  const toForm = p => Object.fromEntries(Object.keys(EMPTY).map(k => [k, p[k] ?? '']))

  return (
    <div className="panel-card">
      {adding && (
        <ParasiteForm initial={{ ...EMPTY, date_given: todayISO() }} onSave={handleCreate} onCancel={() => setAdding(false)} t={t} />
      )}

      {sorted.length === 0 && !adding ? (
        <div className="section-empty">
          <span className="se-emoji">🪲</span>
          <h3 className="t-h3" style={{ margin: '0 0 6px' }}>{tp.emptyTitle}</h3>
          <p className="t-bodysm" style={{ margin: 0 }}>{tp.emptySub}</p>
        </div>
      ) : (
        <ul className="row-list">
          {sorted.map(p => (
            editingId === p.id ? (
              <li key={p.id} style={{ paddingTop: 12 }}>
                <ParasiteForm initial={toForm(p)} onSave={form => handleUpdate(p.id, form)} onCancel={() => setEditingId(null)} t={t} />
              </li>
            ) : (
              <li className="row-item" key={p.id}>
                <div className="rem-ic parasite"><Bug size={17} /></div>
                <div className="grow">
                  <div className="name">{p.product} <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{tp.kinds[p.kind]}</span></div>
                  <div className="meta">
                    {tp.given} {formatDate(p.date_given, lang)}
                    {p.next_due_date && <> · {tp.nextShort} {formatDate(p.next_due_date, lang)}</>}
                    {p.cost != null && <> · {formatMoney(p.cost, user?.currency, lang)}</>}
                  </div>
                  {p.notes && <div className="meta">{p.notes}</div>}
                </div>
                {latest.has(p.id)
                  ? <StatusPill status={parasiteStatus(p)} t={t} />
                  : <span className="status status-muted">{tp.previous}</span>}
                {canEdit && (
                  <div className="row-actions">
                    <button className="icon-sm" onClick={() => { setEditingId(p.id); setAdding(false) }} aria-label={t.checkup.editBtn} title={t.checkup.editBtn}><Pencil size={14} /></button>
                    <button className="icon-sm danger" onClick={() => handleDelete(p)} aria-label={tp.delete} title={tp.delete}><Trash2 size={14} /></button>
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
