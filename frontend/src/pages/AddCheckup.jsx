import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, User, MapPin, Activity, Pill, Sparkles, Check, Plus, Trash2, Stethoscope } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useLanguage } from '../context/LanguageContext'
import { createCheckup } from '../api'

const today = new Date().toISOString().slice(0, 10)

function Field({ label, required, hint, span2, error, children }) {
  return (
    <div className={`field${span2 ? ' col-2' : ''}`}>
      <label>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
      {hint && <span className="hint">{hint}</span>}
      {error && <span style={{ fontSize: 12, color: 'var(--danger-ink)', fontWeight: 700 }}>{error}</span>}
    </div>
  )
}

function FSection({ n, icon: Icon, title, sub, children, delay = 0 }) {
  return (
    <div className="fsection" style={{ animationDelay: `${delay}ms` }}>
      <div className="fsection-head">
        <div className="fsection-num">{n}</div>
        <div style={{ flex: 1 }}>
          <h3 className="t-h3" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Icon size={18} style={{ color: 'var(--primary-ink)' }} /> {title}
          </h3>
          {sub && <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function emptyMed() { return { id: Date.now(), name: '', concentration: '', frequency: '', duration_days: '', notes: '' } }

const FREQ_OPTIONS = ['Una vez al día', 'Dos veces al día', 'Cada 8 horas', 'Semanal', 'Mensual', 'Según indicación']

export default function AddCheckup() {
  const { id: petId } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [form, setForm] = useState({
    vet_name: '', clinic_name: '', checkup_date: today,
    reason: '', diagnosis: '', observations: '', next_visit_date: '',
  })
  const [medications, setMedications] = useState([])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }
  function setMed(id, key, val) { setMedications(prev => prev.map(m => m.id === id ? { ...m, [key]: val } : m)) }
  function addMed() { setMedications(prev => [...prev, emptyMed()]) }
  function removeMed(id) { setMedications(prev => prev.filter(m => m.id !== id)) }

  function validate() {
    const e = {}
    if (!form.vet_name.trim()) e.vet_name = t.addCheckup.vetRequired
    if (!form.checkup_date) e.checkup_date = t.addCheckup.dateRequired
    if (!form.reason.trim()) e.reason = t.addCheckup.reasonRequired
    medications.forEach((m, i) => {
      if (!m.name.trim()) e[`med_name_${i}`] = t.addCheckup.medNameRequired
      if (!m.frequency.trim()) e[`med_freq_${i}`] = t.addCheckup.medFreqRequired
    })
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      const meds = medications.map(({ id, ...m }) => ({
        ...m,
        duration_days: m.duration_days !== '' ? parseInt(m.duration_days) : null,
      }))
      await createCheckup(petId, { ...form, medications: meds })
      navigate(`/pets/${petId}`)
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || t.addCheckup.saveError })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 24, maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
        <div className="screen form-wrap">

          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} strokeWidth={2.4} />
            {t.common.back}
          </button>

          {/* Hero */}
          <div className="form-hero">
            <div className="fh-ic">
              <Stethoscope size={26} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 className="t-h2" style={{ margin: '0 0 3px' }}>{t.addCheckup.title}</h1>
              <p>{t.addCheckup.subtitle || 'Registra los detalles de la visita al veterinario.'}</p>
            </div>
          </div>

          {/* Section 1: Visit */}
          <FSection n="1" icon={Calendar} title={t.addCheckup.visitSection || 'La visita'} sub={t.addCheckup.visitSub || '¿Cuándo y dónde ocurrió?'} delay={0}>
            <div className="fgrid">
              <Field label={t.addCheckup.date} required error={errors.checkup_date}>
                <div className="input-ic">
                  <Calendar size={18} />
                  <input className="input" type="date" value={form.checkup_date} onChange={e => set('checkup_date', e.target.value)} />
                </div>
              </Field>
              <Field label={t.addCheckup.reason} required error={errors.reason}>
                <input className="input" placeholder={t.addCheckup.reasonPlaceholder} value={form.reason} onChange={e => set('reason', e.target.value)} />
              </Field>
              <Field label={t.addCheckup.vet} required error={errors.vet_name}>
                <div className="input-ic">
                  <User size={18} />
                  <input className="input" placeholder={t.addCheckup.vetPlaceholder} value={form.vet_name} onChange={e => set('vet_name', e.target.value)} />
                </div>
              </Field>
              <Field label={t.addCheckup.clinic}>
                <div className="input-ic">
                  <MapPin size={18} />
                  <input className="input" placeholder={t.addCheckup.clinicPlaceholder} value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)} />
                </div>
              </Field>
            </div>
          </FSection>

          {/* Section 2: Findings */}
          <FSection n="2" icon={Activity} title={t.addCheckup.findingsSection || 'Hallazgos'} sub={t.addCheckup.findingsSub || 'Lo que observó el veterinario.'} delay={70}>
            <Field label={t.addCheckup.diagnosis} span2>
              <input className="input" placeholder={t.addCheckup.diagnosisPlaceholder} value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} />
            </Field>
            <div style={{ height: 12 }} />
            <Field label={t.addCheckup.observations} span2 hint={t.addCheckup.observationsHint || 'Cualquier detalle importante para la próxima visita.'}>
              <textarea className="textarea" placeholder={t.addCheckup.observationsPlaceholder} value={form.observations} onChange={e => set('observations', e.target.value)} />
            </Field>
            <div style={{ height: 4 }} />
            <Field label={t.addCheckup.nextVisit}>
              <div className="input-ic">
                <Calendar size={18} />
                <input className="input" type="date" value={form.next_visit_date} onChange={e => set('next_visit_date', e.target.value)} />
              </div>
            </Field>
          </FSection>

          {/* Section 3: Medications */}
          <FSection n="3" icon={Pill} title={t.addCheckup.medsTitle} sub={t.addCheckup.medsSub || 'Agrega las prescripciones de esta visita.'} delay={140}>
            {medications.map((m, i) => (
              <div className="med-row" key={m.id}>
                <Field label={i === 0 ? t.addCheckup.medName : ''} error={errors[`med_name_${i}`]}>
                  <input className="input" placeholder={t.addCheckup.medNamePlaceholder} value={m.name} onChange={e => setMed(m.id, 'name', e.target.value)} />
                </Field>
                <Field label={i === 0 ? t.addCheckup.medConc : ''}>
                  <input className="input" placeholder={t.addCheckup.medConcPlaceholder} value={m.concentration} onChange={e => setMed(m.id, 'concentration', e.target.value)} />
                </Field>
                <Field label={i === 0 ? t.addCheckup.medFreq : ''} error={errors[`med_freq_${i}`]}>
                  <input className="input" placeholder={t.addCheckup.medFreqPlaceholder} value={m.frequency} onChange={e => setMed(m.id, 'frequency', e.target.value)} list={`freq-list-${m.id}`} />
                  <datalist id={`freq-list-${m.id}`}>
                    {FREQ_OPTIONS.map(o => <option key={o} value={o} />)}
                  </datalist>
                </Field>
                <button className="del" onClick={() => removeMed(m.id)} title="Eliminar">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button className="add-med" onClick={addMed}>
              <Plus size={18} strokeWidth={2.6} /> {t.addCheckup.medsAdd}
            </button>
          </FSection>

          {errors.submit && (
            <p style={{ textAlign: 'center', color: 'var(--danger-ink)', fontWeight: 700, fontSize: 14, margin: '8px 0' }}>
              ⚠️ {errors.submit}
            </p>
          )}

          {/* Sticky save bar */}
          <div className="savebar">
            <div className="sb-glass">
              <span className="sb-note">
                <Sparkles size={16} style={{ color: 'var(--primary-ink)' }} />
                {t.addCheckup.saveNote || 'Cada visita construye la historia de salud de tu mascota'}
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
                  {t.common.cancel || 'Cancelar'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={loading}>
                  <Check size={16} strokeWidth={2.8} />
                  {loading ? t.common.saving : t.addCheckup.submit}
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
