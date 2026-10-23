import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useLanguage } from '../context/LanguageContext'
import { getPet, createPet, updatePet, uploadPetPhoto } from '../api'
import { SPECIES, speciesMeta, speciesLabel } from '../utils/species'

const inputStyle = { width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.92rem', color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif', outline: 'none', boxSizing: 'border-box' }

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

export default function AddPet() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const isEdit = !!id
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({ name: '', species: 'dog', breed: '', birth_date: '', gender: '', weight_kg: '', notes: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadingPet, setLoadingPet] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    getPet(id).then(res => {
      const p = res.data
      setForm({ name: p.name || '', species: p.species || 'dog', breed: p.breed || '', birth_date: p.birth_date || '', gender: p.gender || '', weight_kg: p.weight_kg ?? '', notes: p.notes || '' })
      if (p.photo_url) setPhotoPreview(p.photo_url)
    }).finally(() => setLoadingPet(false))
  }, [id, isEdit])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = t.addPet.nameRequired
    if (!form.species) e.species = t.addPet.speciesRequired
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      const body = { ...form, weight_kg: form.weight_kg !== '' ? parseFloat(form.weight_kg) : null }
      let petId = id
      if (isEdit) {
        await updatePet(id, body)
      } else {
        const res = await createPet(body)
        petId = res.data.id
      }
      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        await uploadPetPhoto(petId, fd)
      }
      navigate(`/pets/${petId}`)
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || t.addPet.saveError })
    } finally {
      setLoading(false)
    }
  }

  if (loadingPet) return <><Navbar /><div style={{ paddingTop: '120px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.common.loading}</div></>

  return (
    <>
      <style>{`.pet-input:focus { border-color: var(--color-primary) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent); }`}</style>
      <Navbar />
      <main style={{ paddingTop: '80px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '60px', maxWidth: '680px', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', padding: '32px', marginTop: '24px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.common.back}</button>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{isEdit ? t.addPet.titleEdit : t.addPet.titleNew}</h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-tertiary)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {photoPreview
                  ? <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '2.5rem' }}>{speciesMeta(form.species).emoji}</span>
                }
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
              <button onClick={() => fileInputRef.current?.click()} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                📷 {photoFile ? t.addPet.photoChange : t.addPet.photoUpload}
              </button>
            </div>

            <Field label={t.addPet.name} required error={errors.name}>
              <input className="pet-input" style={inputStyle} type="text" placeholder={t.addPet.namePlaceholder} value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>

            <Field label={t.addPet.species} required error={errors.species}>
              <select className="pet-input" style={inputStyle} value={form.species} onChange={e => set('species', e.target.value)}>
                {SPECIES.map(s => (
                  <option key={s} value={s}>{speciesMeta(s).emoji} {speciesLabel(s, t)}</option>
                ))}
              </select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label={t.addPet.breed}>
                <input className="pet-input" style={inputStyle} type="text" placeholder={t.addPet.breedPlaceholder} value={form.breed} onChange={e => set('breed', e.target.value)} />
              </Field>
              <Field label={t.addPet.birthDate}>
                <input className="pet-input" style={inputStyle} type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label={t.addPet.gender}>
                <select className="pet-input" style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">{t.addPet.noGender}</option>
                  <option value="male">{t.addPet.maleOption}</option>
                  <option value="female">{t.addPet.femaleOption}</option>
                </select>
              </Field>
              <Field label={t.addPet.weight}>
                <input className="pet-input" style={inputStyle} type="number" step="0.1" min="0" placeholder={t.addPet.weightPlaceholder} value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} />
              </Field>
            </div>

            <Field label={t.addPet.notes}>
              <textarea className="pet-input" style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder={t.addPet.notesPlaceholder} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>

            {errors.submit && <p style={{ textAlign: 'center', color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.875rem' }}>⚠️ {errors.submit}</p>}

            <button onClick={handleSubmit} disabled={loading}
              style={{ background: loading ? 'var(--text-muted)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '1rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--color-primary-hover)' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--color-primary)' }}>
              {loading ? t.common.saving : (isEdit ? t.addPet.submitEdit : t.addPet.submitNew)}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
