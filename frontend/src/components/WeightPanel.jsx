import { useEffect, useState } from 'react'
import { Trash2, Check, X } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { createWeight, deleteWeight, getPet } from '../api'
import { formatDate, todayISO } from '../utils/format'
import LineChart from './LineChart'
import { useFeedback } from '../context/FeedbackContext'

const LOCALES = { es: 'es-ES', en: 'en-US' }

export default function WeightPanel({ pet, weights, setWeights, canEdit, onPetUpdate, addRequest = 0 }) {
  const { t, lang } = useLanguage()
  const { askConfirm, toast } = useFeedback()
  const tw = t.weight
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ measured_on: todayISO(), weight_kg: '', notes: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // El botón «Registrar peso» vive en la cabecera de pestañas (PetProfile)
  useEffect(() => {
    if (addRequest > 0 && canEdit) setAdding(true)
  }, [addRequest, canEdit])

  const num = v => v.toLocaleString(LOCALES[lang] || LOCALES.es, { maximumFractionDigits: 2 })
  const latest = weights[weights.length - 1]
  const previous = weights[weights.length - 2]
  const delta = latest && previous ? latest.weight_kg - previous.weight_kg : null

  // El peso actual de la mascota lo recalcula el backend; se vuelve a pedir para reflejarlo
  async function refreshPet() {
    const res = await getPet(pet.id)
    onPetUpdate(res.data)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.measured_on || !(Number(form.weight_kg) > 0)) { setError(tw.invalid); return }
    setSaving(true)
    setError('')
    try {
      const res = await createWeight(pet.id, { ...form, weight_kg: Number(form.weight_kg) })
      setWeights(prev => [...prev.filter(w => w.id !== res.data.id), res.data]
        .sort((a, b) => a.measured_on.localeCompare(b.measured_on) || a.id - b.id))
      setForm({ measured_on: todayISO(), weight_kg: '', notes: '' })
      setAdding(false)
      await refreshPet()
    } catch (err) {
      setError(err.response?.data?.error || t.common.error500)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(w) {
    if (!await askConfirm(tw.deleteConfirm)) return
    try {
      await deleteWeight(w.id)
      setWeights(prev => prev.filter(x => x.id !== w.id))
      await refreshPet()
    } catch {
      toast(t.common.error500)
    }
  }

  return (
    <div className="panel-card">
      {latest && (
        <div className="stat-row">
          <div className="stat">
            <div className="label">{tw.current}</div>
            <div className="value">{num(latest.weight_kg)} <small>{t.common.kg}</small></div>
            <div className="delta">{formatDate(latest.measured_on, lang)}</div>
          </div>
          {delta != null && (
            <div className="stat">
              <div className="label">{tw.change}</div>
              <div className="value">{delta > 0 ? '+' : delta < 0 ? '−' : ''}{num(Math.abs(delta))} <small>{t.common.kg}</small></div>
              <div className="delta">{tw.since.replace('{date}', formatDate(previous.measured_on, lang))}</div>
            </div>
          )}
        </div>
      )}

      {weights.length > 0 && (
        <>
          <h3 className="t-label muted-3" style={{ margin: '10px 0 4px' }}>{tw.chartTitle}</h3>
          <LineChart
            points={weights.map(w => ({ date: w.measured_on, value: w.weight_kg, note: w.notes }))}
            unit={t.common.kg}
            lang={lang}
            ariaLabel={tw.chartAria.replace('{name}', pet.name)}
          />
        </>
      )}

      {adding && (
        <form className="inline-form" style={{ marginTop: latest ? 14 : 0 }} onSubmit={handleAdd}>
          <div className="fgrid-3">
            <div className="field">
              <label>{tw.date}</label>
              <input className="input" type="date" max={todayISO()} value={form.measured_on} onChange={e => setForm(f => ({ ...f, measured_on: e.target.value }))} />
            </div>
            <div className="field">
              <label>{tw.weightKg}</label>
              <input className="input" type="number" step="0.01" min="0" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} autoFocus />
            </div>
            <div className="field">
              <label>{tw.notes}</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          {error && <p className="form-error">⚠️ {error}</p>}
          <div className="actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setError('') }}><X size={14} /> {t.common.cancel}</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}><Check size={14} /> {saving ? t.common.saving : t.checkup.saveBtn}</button>
          </div>
        </form>
      )}

      {weights.length === 0 && !adding ? (
        <div className="section-empty">
          <span className="se-emoji">⚖️</span>
          <h3 className="t-h3" style={{ margin: '0 0 6px' }}>{tw.emptyTitle}</h3>
          <p className="t-bodysm" style={{ margin: 0 }}>{tw.emptySub}</p>
        </div>
      ) : weights.length > 0 && (
        <table className="data-table">
          <thead>
            <tr><th>{tw.date}</th><th>{tw.weightKg}</th><th>{tw.notes}</th>{canEdit && <th aria-label={tw.delete} />}</tr>
          </thead>
          <tbody>
            {[...weights].reverse().map(w => (
              <tr key={w.id}>
                <td>{formatDate(w.measured_on, lang)}</td>
                <td style={{ fontWeight: 800 }}>{num(w.weight_kg)}</td>
                <td style={{ color: 'var(--text-2)' }}>{w.notes || '—'}</td>
                {canEdit && (
                  <td style={{ width: 40 }}>
                    <button className="icon-sm danger" onClick={() => handleDelete(w)} aria-label={tw.delete} title={tw.delete}><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
