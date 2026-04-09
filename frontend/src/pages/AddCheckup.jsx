import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { createCheckup, getPetCheckups } from '../api'

const today = new Date().toISOString().slice(0, 10)

const inputStyle = {
  width: '100%',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  padding: '10px 14px',
  fontSize: '0.92rem',
  color: 'var(--text-primary)',
  fontFamily: 'Nunito, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
}

function Field({ label, required, error, children, half }) {
  return (
    <div style={half ? {} : {}}>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
        {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  )
}

function emptyMed() {
  return { name: '', concentration: '', frequency: '', duration_days: '', notes: '' }
}

export default function AddCheckup() {
  const { id: petId } = useParams()
  const navigate = useNavigate()

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

  function setMed(idx, key, val) {
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, [key]: val } : m))
  }

  function addMed() { setMedications(prev => [...prev, emptyMed()]) }
  function removeMed(idx) { setMedications(prev => prev.filter((_, i) => i !== idx)) }

  function validate() {
    const e = {}
    if (!form.vet_name.trim()) e.vet_name = 'El nombre del veterinario es requerido'
    if (!form.checkup_date) e.checkup_date = 'La fecha es requerida'
    if (!form.reason.trim()) e.reason = 'El motivo es requerido'
    medications.forEach((m, i) => {
      if (!m.name.trim()) e[`med_name_${i}`] = 'Nombre requerido'
      if (!m.frequency.trim()) e[`med_freq_${i}`] = 'Frecuencia requerida'
    })
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      const meds = medications.map(m => ({
        ...m,
        duration_days: m.duration_days !== '' ? parseInt(m.duration_days) : null,
      }))
      await createCheckup(petId, { ...form, medications: meds })
      navigate(`/pets/${petId}`)
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Error al guardar' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`.ck-input:focus { border-color: var(--color-primary) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent); }`}</style>
      <Navbar />
      <main style={{ paddingTop: '80px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '60px', maxWidth: '680px', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', padding: '32px', marginTop: '24px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>← Volver</button>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>Nuevo checkup</h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Veterinario" required error={errors.vet_name}>
                <input className="ck-input" style={inputStyle} type="text" placeholder="Nombre del veterinario" value={form.vet_name} onChange={e => set('vet_name', e.target.value)} />
              </Field>
              <Field label="Clínica / Hospital">
                <input className="ck-input" style={inputStyle} type="text" placeholder="Nombre de la clínica" value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Fecha de consulta" required error={errors.checkup_date}>
                <input className="ck-input" style={inputStyle} type="date" value={form.checkup_date} onChange={e => set('checkup_date', e.target.value)} />
              </Field>
              <Field label="Próxima visita">
                <input className="ck-input" style={inputStyle} type="date" value={form.next_visit_date} onChange={e => set('next_visit_date', e.target.value)} />
              </Field>
            </div>

            <Field label="Motivo de consulta" required error={errors.reason}>
              <textarea className="ck-input" style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Motivo de la consulta" value={form.reason} onChange={e => set('reason', e.target.value)} />
            </Field>

            <Field label="Diagnóstico">
              <textarea className="ck-input" style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Diagnóstico obtenido" value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} />
            </Field>

            <Field label="Observaciones">
              <textarea className="ck-input" style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Observaciones adicionales" value={form.observations} onChange={e => set('observations', e.target.value)} />
            </Field>

            {/* Medications */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>💊 Medicamentos recetados</h3>
                <button onClick={addMed} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem' }}>＋ Agregar</button>
              </div>

              {medications.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No se agregaron medicamentos</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {medications.map((med, i) => (
                    <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                      <button
                        onClick={() => removeMed(i)}
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '1rem', lineHeight: 1 }}
                      >✕</button>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Nombre <span style={{ color: 'var(--color-danger)' }}>*</span>
                          </label>
                          <input className="ck-input" style={{ ...inputStyle, background: 'var(--bg-secondary)' }} type="text" placeholder="Nombre del medicamento" value={med.name} onChange={e => setMed(i, 'name', e.target.value)} />
                          {errors[`med_name_${i}`] && <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-danger)' }}>{errors[`med_name_${i}`]}</p>}
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Concentración</label>
                          <input className="ck-input" style={{ ...inputStyle, background: 'var(--bg-secondary)' }} type="text" placeholder="ej: 500mg" value={med.concentration} onChange={e => setMed(i, 'concentration', e.target.value)} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Frecuencia <span style={{ color: 'var(--color-danger)' }}>*</span>
                          </label>
                          <input className="ck-input" style={{ ...inputStyle, background: 'var(--bg-secondary)' }} type="text" placeholder="ej: Cada 12 horas" value={med.frequency} onChange={e => setMed(i, 'frequency', e.target.value)} />
                          {errors[`med_freq_${i}`] && <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-danger)' }}>{errors[`med_freq_${i}`]}</p>}
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Días</label>
                          <input className="ck-input" style={{ ...inputStyle, background: 'var(--bg-secondary)' }} type="number" min="1" placeholder="Días" value={med.duration_days} onChange={e => setMed(i, 'duration_days', e.target.value)} />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Notas</label>
                        <input className="ck-input" style={{ ...inputStyle, background: 'var(--bg-secondary)' }} type="text" placeholder="Notas del medicamento" value={med.notes} onChange={e => setMed(i, 'notes', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errors.submit && <p style={{ textAlign: 'center', color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.875rem' }}>⚠️ {errors.submit}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ background: loading ? 'var(--text-muted)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '1rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: loading ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--color-primary-hover)' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--color-primary)' }}
            >
              {loading ? 'Guardando...' : 'Registrar checkup'}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
