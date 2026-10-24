import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Phone, Mail, MapPin, Stethoscope, History, Check, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useLanguage } from '../context/LanguageContext'
import { useFeedback } from '../context/FeedbackContext'
import { getVets, createVet, updateVet, deleteVet, importVetsFromHistory } from '../api'
import { invalidateVetCache } from '../components/VetInput'

const EMPTY = { name: '', clinic: '', phone: '', email: '', address: '', notes: '' }

function VetForm({ initial, onSave, onCancel, t }) {
  const tv = t.vets
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError(tv.required); return }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err) {
      setError(err.response?.data?.error || t.common.error500)
      setSaving(false)
    }
  }

  const field = (k, label, props = {}) => (
    <div className={`field${props.wide ? ' col-2' : ''}`}>
      <label>{label}{k === 'name' && <span className="req"> *</span>}</label>
      <input className="input" value={form[k]} onChange={e => set(k, e.target.value)} type={props.type || 'text'} placeholder={props.placeholder} autoFocus={k === 'name'} />
    </div>
  )

  return (
    <form className="inline-form" onSubmit={submit}>
      <div className="fgrid">
        {field('name', tv.name, { placeholder: tv.namePlaceholder })}
        {field('clinic', tv.clinic)}
        {field('phone', tv.phone, { type: 'tel' })}
        {field('email', tv.email, { type: 'email' })}
        {field('address', tv.address, { wide: true })}
        {field('notes', tv.notes, { wide: true })}
      </div>
      {error && <p className="form-error">⚠️ {error}</p>}
      <div className="actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}><X size={14} /> {t.common.cancel}</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}><Check size={14} /> {saving ? t.common.saving : t.checkup.saveBtn}</button>
      </div>
    </form>
  )
}

export default function Vets() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const tv = t.vets
  const { askConfirm, toast } = useFeedback()
  const [vets, setVets] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    getVets().then(res => setVets(res.data)).catch(() => setVets([]))
  }, [])

  // Cualquier cambio invalida las sugerencias de los formularios
  const replace = list => { invalidateVetCache(); setVets([...list].sort((a, b) => a.name.localeCompare(b.name))) }

  async function handleCreate(form) {
    const res = await createVet(form)
    replace([...vets, res.data])
    setAdding(false)
  }

  async function handleUpdate(id, form) {
    const res = await updateVet(id, form)
    replace(vets.map(v => (v.id === id ? res.data : v)))
    setEditingId(null)
  }

  async function handleDelete(v) {
    if (!await askConfirm(tv.deleteConfirm.replace('{name}', v.name))) return
    try {
      await deleteVet(v.id)
      replace(vets.filter(x => x.id !== v.id))
    } catch {
      toast(t.common.error500)
    }
  }

  async function handleImport() {
    try {
      const res = await importVetsFromHistory()
      replace(res.data.vets)
      toast(res.data.added ? tv.imported.replace('{n}', res.data.added) : tv.importedNone, res.data.added ? 'success' : 'error')
    } catch {
      toast(t.common.error500)
    }
  }

  const toForm = v => Object.fromEntries(Object.keys(EMPTY).map(k => [k, v[k] ?? '']))

  return (
    <>
      <Navbar />
      <main style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 60, maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
        <div className="screen form-wrap">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} strokeWidth={2.4} />
            {t.dashboard.title}
          </button>

          <div className="form-hero">
            <div className="fh-ic"><Stethoscope size={26} /></div>
            <div style={{ flex: 1 }}>
              <h1 className="t-h2" style={{ margin: '0 0 3px' }}>{tv.title}</h1>
              <p>{tv.subtitle}</p>
            </div>
          </div>

          <div className="vets-tools">
            <button className="btn btn-ghost btn-sm" onClick={handleImport}><History size={15} /> {tv.importHistory}</button>
            <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setEditingId(null) }}><Plus size={15} /> {tv.add}</button>
          </div>

          <div className="panel-card">
            {adding && <VetForm initial={EMPTY} onSave={handleCreate} onCancel={() => setAdding(false)} t={t} />}

            {vets === null ? (
              <p className="muted" style={{ textAlign: 'center' }}>{t.common.loading}</p>
            ) : vets.length === 0 && !adding ? (
              <div className="section-empty">
                <span className="se-emoji">🩺</span>
                <h3 className="t-h3" style={{ margin: '0 0 6px' }}>{tv.emptyTitle}</h3>
                <p className="t-bodysm" style={{ margin: 0 }}>{tv.emptySub}</p>
              </div>
            ) : (
              <ul className="row-list">
                {vets.map(v => (
                  editingId === v.id ? (
                    <li key={v.id} style={{ paddingTop: 12 }}>
                      <VetForm initial={toForm(v)} onSave={form => handleUpdate(v.id, form)} onCancel={() => setEditingId(null)} t={t} />
                    </li>
                  ) : (
                    <li className="row-item" key={v.id}>
                      <div className="rem-ic"><Stethoscope size={17} /></div>
                      <div className="grow">
                        <div className="name">{v.name}</div>
                        {v.clinic && <div className="meta">{v.clinic}</div>}
                        <div className="vet-contact">
                          {v.phone && <a href={`tel:${v.phone.replace(/\s+/g, '')}`}><Phone size={13} /> {v.phone}</a>}
                          {v.email && <a href={`mailto:${v.email}`}><Mail size={13} /> {v.email}</a>}
                          {v.address && <span><MapPin size={13} /> {v.address}</span>}
                        </div>
                        {v.notes && <div className="meta">{v.notes}</div>}
                      </div>
                      <div className="row-actions">
                        <button className="icon-sm" onClick={() => { setEditingId(v.id); setAdding(false) }} aria-label={t.common.edit} title={t.common.edit}><Pencil size={14} /></button>
                        <button className="icon-sm danger" onClick={() => handleDelete(v)} aria-label={t.common.delete} title={t.common.delete}><Trash2 size={14} /></button>
                      </div>
                    </li>
                  )
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
