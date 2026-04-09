import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useLanguage } from '../context/LanguageContext'
import { createExam, getPetCheckups } from '../api'

const today = new Date().toISOString().slice(0, 10)
const inputStyle = { width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.92rem', color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif', outline: 'none', boxSizing: 'border-box' }
const cellInputStyle = { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '0.83rem', color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif', padding: '4px 6px', boxSizing: 'border-box' }

function Field({ label, required, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
        {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  )
}

function emptyValue() { return { parameter_name: '', value: '', unit: '', reference_range: '', is_abnormal: false } }

function formatDateLabel(dateStr, reason) {
  if (!dateStr) return reason
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y} — ${reason}`
}

export default function AddExam() {
  const { id: petId } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const pdfInputRef = useRef(null)

  const [form, setForm] = useState({ exam_type: '', exam_date: today, lab_name: '', checkup_id: '', notes: '' })
  const [pdfFile, setPdfFile] = useState(null)
  const [values, setValues] = useState([])
  const [checkups, setCheckups] = useState([])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getPetCheckups(petId).then(res => setCheckups(res.data)).catch(() => {})
  }, [petId])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }
  function setVal(idx, key, val) { setValues(prev => prev.map((v, i) => i === idx ? { ...v, [key]: val } : v)) }
  function addValue() { setValues(prev => [...prev, emptyValue()]) }
  function removeValue(idx) { setValues(prev => prev.filter((_, i) => i !== idx)) }
  function handlePdfSelect(e) { const file = e.target.files[0]; if (file) setPdfFile(file); e.target.value = '' }

  function validate() {
    const e = {}
    if (!form.exam_type.trim()) e.exam_type = t.addExam.examTypeRequired
    if (!form.exam_date) e.exam_date = t.addExam.dateRequired
    values.forEach((v, i) => {
      if (!v.parameter_name.trim()) e[`val_param_${i}`] = t.addExam.paramRequired
      if (!v.value.trim()) e[`val_value_${i}`] = t.addExam.paramRequired
    })
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('exam_type', form.exam_type)
      fd.append('exam_date', form.exam_date)
      if (form.lab_name) fd.append('lab_name', form.lab_name)
      if (form.checkup_id) fd.append('checkup_id', form.checkup_id)
      if (form.notes) fd.append('notes', form.notes)
      if (pdfFile) fd.append('pdf', pdfFile)
      if (values.length > 0) fd.append('values', JSON.stringify(values.map(v => ({ ...v, is_abnormal: v.is_abnormal ? 1 : 0 }))))
      await createExam(petId, fd)
      navigate(`/pets/${petId}`)
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || t.addExam.saveError })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .ex-input:focus { border-color: var(--color-primary) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent); }
        .ex-cell-input:focus { background: color-mix(in srgb, var(--color-primary) 8%, transparent) !important; }
        @media (max-width: 600px) { .values-table{display:none} .values-mobile{display:flex !important} }
        @media (min-width: 601px) { .values-mobile{display:none !important} }
      `}</style>
      <Navbar />
      <main style={{ paddingTop: '80px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '60px', maxWidth: '680px', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', padding: '32px', marginTop: '24px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.common.back}</button>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t.addExam.title}</h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <Field label={t.addExam.examType} required error={errors.exam_type}>
              <input className="ex-input" style={inputStyle} type="text" placeholder={t.addExam.examTypePlaceholder} value={form.exam_type} onChange={e => set('exam_type', e.target.value)} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label={t.addExam.date} required error={errors.exam_date}>
                <input className="ex-input" style={inputStyle} type="date" value={form.exam_date} onChange={e => set('exam_date', e.target.value)} />
              </Field>
              <Field label={t.addExam.lab}>
                <input className="ex-input" style={inputStyle} type="text" placeholder={t.addExam.labPlaceholder} value={form.lab_name} onChange={e => set('lab_name', e.target.value)} />
              </Field>
            </div>

            <Field label={t.addExam.checkupAssoc}>
              <select className="ex-input" style={inputStyle} value={form.checkup_id} onChange={e => set('checkup_id', e.target.value)}>
                <option value="">{t.addExam.noCheckup}</option>
                {checkups.map(c => <option key={c.id} value={c.id}>{formatDateLabel(c.checkup_date, c.reason)}</option>)}
              </select>
            </Field>

            <Field label={t.addExam.notes}>
              <textarea className="ex-input" style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder={t.addExam.notesPlaceholder} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>

            {/* PDF */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>{t.addExam.pdfLabel}</label>
              <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfSelect} />
              {pdfFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '1.1rem' }}>📄</span>
                  <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfFile.name}</span>
                  <button onClick={() => setPdfFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '1rem', flexShrink: 0 }}>✕</button>
                </div>
              ) : (
                <button onClick={() => pdfInputRef.current?.click()} style={{ background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '10px 18px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {t.addExam.pdfBtn}
                </button>
              )}
            </div>

            {/* Values */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t.addExam.valuesTitle}</h3>
                <button onClick={addValue} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem' }}>{t.addExam.valuesAdd}</button>
              </div>

              {values.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>{t.addExam.valuesEmpty}</p>
              ) : (
                <>
                  <div className="values-table" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-tertiary)' }}>
                          {[t.addExam.colParam, t.addExam.colValue, t.addExam.colUnit, t.addExam.colRange, t.addExam.colAbnormal, ''].map(h => (
                            <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {values.map((v, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--border-color)', background: v.is_abnormal ? 'color-mix(in srgb, var(--color-danger) 6%, transparent)' : 'transparent' }}>
                            <td style={{ padding: '4px' }}>
                              <input className="ex-cell-input" style={cellInputStyle} type="text" placeholder="Parámetro" value={v.parameter_name} onChange={e => setVal(i, 'parameter_name', e.target.value)} />
                              {errors[`val_param_${i}`] && <p style={{ margin: '2px 0 0 6px', fontSize: '0.7rem', color: 'var(--color-danger)' }}>{errors[`val_param_${i}`]}</p>}
                            </td>
                            <td style={{ padding: '4px' }}>
                              <input className="ex-cell-input" style={cellInputStyle} type="text" placeholder="Valor" value={v.value} onChange={e => setVal(i, 'value', e.target.value)} />
                              {errors[`val_value_${i}`] && <p style={{ margin: '2px 0 0 6px', fontSize: '0.7rem', color: 'var(--color-danger)' }}>{errors[`val_value_${i}`]}</p>}
                            </td>
                            <td style={{ padding: '4px' }}><input className="ex-cell-input" style={cellInputStyle} type="text" placeholder="mg/dL" value={v.unit} onChange={e => setVal(i, 'unit', e.target.value)} /></td>
                            <td style={{ padding: '4px' }}><input className="ex-cell-input" style={cellInputStyle} type="text" placeholder="70-100" value={v.reference_range} onChange={e => setVal(i, 'reference_range', e.target.value)} /></td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <input type="checkbox" checked={v.is_abnormal} onChange={e => setVal(i, 'is_abnormal', e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--color-danger)' }} />
                            </td>
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <button onClick={() => removeValue(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '0.95rem' }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="values-mobile" style={{ flexDirection: 'column', gap: '10px' }}>
                    {values.map((v, i) => (
                      <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '14px', position: 'relative', border: v.is_abnormal ? '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)' : '1px solid var(--border-color)' }}>
                        <button onClick={() => removeValue(i)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>✕</button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {[
                            { label: t.addExam.colParam, key: 'parameter_name' },
                            { label: t.addExam.colValue, key: 'value' },
                            { label: t.addExam.colUnit, key: 'unit' },
                            { label: t.addExam.colRange, key: 'reference_range' },
                          ].map(({ label, key }) => (
                            <div key={key}>
                              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>{label}</label>
                              <input style={{ ...inputStyle, background: 'var(--bg-secondary)', padding: '7px 10px', fontSize: '0.83rem' }} type="text" value={v[key]} onChange={e => setVal(i, key, e.target.value)} />
                            </div>
                          ))}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '0.83rem', fontWeight: 700, color: 'var(--color-danger)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={v.is_abnormal} onChange={e => setVal(i, 'is_abnormal', e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--color-danger)' }} />
                          {t.addExam.abnormalLabel}
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {errors.submit && <p style={{ textAlign: 'center', color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.875rem' }}>⚠️ {errors.submit}</p>}

            <button onClick={handleSubmit} disabled={loading}
              style={{ background: loading ? 'var(--text-muted)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '1rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: loading ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--color-primary-hover)' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--color-primary)' }}>
              {loading ? t.common.saving : t.addExam.submit}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
