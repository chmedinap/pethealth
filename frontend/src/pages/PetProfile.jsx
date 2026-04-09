import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import Navbar from '../components/Navbar'
import CheckupCard from '../components/CheckupCard'
import ExamViewer from '../components/ExamViewer'
import { useLanguage } from '../context/LanguageContext'
import { getPet, getPetCheckups, getPetExams, deletePet, uploadPetPhoto } from '../api'

function calcAge(birthDate, tc) {
  if (!birthDate) return tc.unknownAge
  const birth = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0) { years--; months += 12 }
  if (years < 0 || (years === 0 && months < 0)) return tc.unknownAge
  if (years === 0) return `${months} ${months === 1 ? tc.month : tc.months}`
  if (months === 0) return `${years} ${years === 1 ? tc.year : tc.years}`
  return `${years} ${years === 1 ? tc.year : tc.years} ${tc.and} ${months} ${months === 1 ? tc.month : tc.months}`
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h2>
      <button onClick={onAction} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', padding: '7px 14px', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}>
        {actionLabel}
      </button>
    </div>
  )
}

function EmptySection({ emoji, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{emoji}</div>
      {text}
    </div>
  )
}

export default function PetProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const { t } = useLanguage()

  const [pet, setPet] = useState(null)
  const [checkups, setCheckups] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [petRes, checkupsRes, examsRes] = await Promise.all([
          getPet(id), getPetCheckups(id), getPetExams(id),
        ])
        setPet(petRes.data)
        setCheckups(checkupsRes.data)
        setExams(examsRes.data)
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await uploadPetPhoto(id, form)
      setPet(prev => ({ ...prev, photo_url: res.data.photo_url }))
    } catch {
      alert(t.profile.uploadError)
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  async function handleDelete() {
    if (!window.confirm(t.profile.deleteConfirm.replace('{name}', pet.name))) return
    try {
      await deletePet(id)
      navigate('/')
    } catch {
      alert(t.profile.deleteError)
    }
  }

  if (loading) return (
    <>
      <Navbar />
      <div style={{ paddingTop: '120px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        {t.common.loading}
      </div>
    </>
  )

  if (notFound) return <Navigate to="/" replace />

  const speciesEmoji = pet.species === 'cat' ? '🐱' : '🐶'
  const speciesLabel = pet.species === 'cat' ? t.common.cat : t.common.dog
  const lastCheckup = checkups[0]?.checkup_date

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '80px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '60px', maxWidth: '900px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Header card */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', padding: '24px', marginTop: '24px', marginBottom: '28px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

          {/* Photo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '200px', height: '200px', borderRadius: '20px', overflow: 'hidden', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {pet.photo_url
                ? <img src={pet.photo_url} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <span style={{ fontSize: '5rem' }}>{speciesEmoji}</span>
              }
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '5px 14px', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: 'var(--text-secondary)', cursor: uploadingPhoto ? 'not-allowed' : 'pointer' }}>
              {uploadingPhoto ? t.profile.uploading : t.profile.changePhoto}
            </button>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{pet.name}</h1>
              <span style={{ background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px' }}>
                {speciesEmoji} {speciesLabel}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', margin: '16px 0' }}>
              <DataItem icon="🎂" label={t.profile.age} value={calcAge(pet.birth_date, t.common)} />
              <DataItem icon="🐾" label={t.profile.breed} value={pet.breed || t.profile.unknownBreed} />
              <DataItem icon="⚖️" label={t.profile.weight} value={pet.weight_kg ? `${pet.weight_kg} ${t.common.kg}` : t.profile.noWeight} />
              <DataItem
                icon={pet.gender === 'male' ? '♂️' : pet.gender === 'female' ? '♀️' : '❓'}
                label={t.profile.gender}
                value={pet.gender === 'male' ? t.common.male : pet.gender === 'female' ? t.common.female : t.common.noGender}
              />
              <DataItem icon="📅" label={t.profile.registered} value={formatDate(pet.created_at)} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <Stethoscope size={14} color="var(--text-muted)" style={{ marginTop: '3px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{t.profile.lastCheckup}</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {lastCheckup ? formatDate(lastCheckup) : t.profile.noVisits}
                  </div>
                </div>
              </div>
            </div>

            {pet.notes && (
              <div style={{ background: 'var(--bg-tertiary)', borderLeft: '4px solid var(--color-primary)', borderRadius: '0 10px 10px 0', padding: '10px 14px', fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '16px' }}>
                {pet.notes}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => navigate(`/pets/${id}/edit`)} style={actionBtn('var(--color-primary)')}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}>
                {t.profile.editBtn}
              </button>
              <button onClick={handleDelete} style={actionBtn('var(--color-danger)')}>
                {t.profile.deleteBtn}
              </button>
            </div>
          </div>
        </div>

        {/* Checkups */}
        <section style={{ marginBottom: '32px' }}>
          <SectionHeader title={t.profile.checkupsTitle} actionLabel={t.profile.newCheckup} onAction={() => navigate(`/pets/${id}/checkups/new`)} />
          {checkups.length === 0
            ? <EmptySection emoji="🩺" text={t.profile.noCheckups} />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {checkups.map(c => (
                <CheckupCard
                  key={c.id}
                  checkup={c}
                  onDelete={did => setCheckups(prev => prev.filter(x => x.id !== did))}
                  onUpdate={updated => setCheckups(prev => prev.map(x => x.id === updated.id ? updated : x))}
                />
              ))}
              </div>
          }
        </section>

        {/* Exams */}
        <section>
          <SectionHeader title={t.profile.examsTitle} actionLabel={t.profile.newExam} onAction={() => navigate(`/pets/${id}/exams/new`)} />
          {exams.length === 0
            ? <EmptySection emoji="🧪" text={t.profile.noExams} />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {exams.map(e => (
                <ExamViewer
                  key={e.id}
                  exam={e}
                  onDelete={did => setExams(prev => prev.filter(x => x.id !== did))}
                  onUpdate={updated => setExams(prev => prev.map(x => x.id === updated.id ? updated : x))}
                />
              ))}
              </div>
          }
        </section>
      </main>
    </>
  )
}

function DataItem({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
      <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: '2px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  )
}

function actionBtn(bg) {
  return { background: bg, color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer' }
}
