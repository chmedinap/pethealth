import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Share2, Cake, Scale, Syringe, Stethoscope, FlaskConical, Plus } from 'lucide-react'
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

function Vital({ icon: Icon, label, value, unit }) {
  return (
    <div className="vital">
      <div className="vi"><Icon size={16} /></div>
      <div>
        <div className="k">{label}</div>
        <div className="v">{value}{unit && <small> {unit}</small>}</div>
      </div>
    </div>
  )
}

export default function PetProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const { t } = useLanguage()
  const [tab, setTab] = useState('checkups')

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
      <main style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 60, maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ paddingTop: 32, textAlign: 'center', color: 'var(--text-3)' }}>{t.common.loading}</div>
      </main>
    </>
  )

  if (notFound) return <Navigate to="/" replace />

  const speciesEmoji = pet.species === 'cat' ? '🐱' : '🐶'
  const speciesCls = pet.species === 'cat' ? 'badge-cat' : 'badge-dog'
  const genderCls = pet.gender === 'male' ? 'badge-gender-m' : 'badge-gender-f'
  const genderLabel = pet.gender === 'male' ? t.common.male : pet.gender === 'female' ? t.common.female : null

  return (
    <>
      <Navbar />
      <main style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 60, maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
        <div className="screen">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} strokeWidth={2.4} />
            {t.dashboard?.title || 'Mis mascotas'}
          </button>

          <div className="profile-grid">
            {/* ── HERO ── */}
            <aside className="pet-hero">
              <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ position: 'relative' }}>
                  {pet.photo_url ? (
                    <div style={{ height: 230 }}>
                      <img
                        src={pet.photo_url}
                        alt={pet.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="photo"
                      style={{ height: 230, borderRadius: 'var(--r-lg) var(--r-lg) 0 0', '--tint': pet.species === 'cat' ? 'var(--accent)' : 'var(--secondary)' }}
                    >
                      <span className="ph-emoji" style={{ fontSize: '3.5em' }}>{speciesEmoji}</span>
                    </div>
                  )}
                </div>

                <div className="pet-hero-body">
                  <h1 className="t-h1">{pet.name} <span style={{ fontSize: 22 }}>{speciesEmoji}</span></h1>

                  <div className="pet-badges">
                    <span className={`badge ${speciesCls}`}>
                      <span className="emoji">{speciesEmoji}</span>
                      {pet.breed || (pet.species === 'cat' ? t.common.cat : t.common.dog)}
                    </span>
                    {genderLabel && (
                      <span className={`badge ${genderCls}`}>
                        {pet.gender === 'male' ? '♂' : '♀'} {genderLabel}
                      </span>
                    )}
                  </div>

                  <div className="vitals">
                    <Vital icon={Cake} label={t.profile.age} value={calcAge(pet.birth_date, t.common)} />
                    <Vital icon={Scale} label={t.profile.weight} value={pet.weight_kg || '—'} unit={pet.weight_kg ? t.common.kg : null} />
                    <Vital icon={Stethoscope} label={t.profile.lastCheckup} value={checkups[0] ? formatDate(checkups[0].checkup_date) : '—'} />
                    <Vital icon={Syringe} label={t.profile.registered || 'Registrado'} value={formatDate(pet.created_at) || '—'} />
                  </div>

                  {pet.notes && (
                    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '13px 15px', marginBottom: 16 }}>
                      <div className="t-label muted-3" style={{ marginBottom: 6 }}>📝 {t.profile.notes || 'Notas'}</div>
                      <p className="t-bodysm muted" style={{ margin: 0 }}>{pet.notes}</p>
                    </div>
                  )}

                  <div style={{ marginBottom: 12 }}>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      style={{ width: '100%' }}
                    >
                      {uploadingPhoto ? t.profile.uploading : t.profile.changePhoto}
                    </button>
                  </div>

                  <div className="hero-actions">
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/pets/${id}/edit`)}>
                      <Pencil size={16} /> {t.profile.editBtn}
                    </button>
                    <button className="icon-btn" onClick={() => {}} title="Compartir"><Share2 size={18} /></button>
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>{t.profile.deleteBtn}</button>
                  </div>
                </div>
              </div>
            </aside>

            {/* ── RECORDS ── */}
            <section>
              <div className="records-head">
                <div className="tabs">
                  <button className="tab" data-on={tab === 'checkups' ? '1' : '0'} onClick={() => setTab('checkups')}>
                    <Stethoscope size={16} />
                    {t.profile.checkupsTitle || 'Consultas'}
                    <span className="pill-n">{checkups.length}</span>
                  </button>
                  <button className="tab" data-on={tab === 'exams' ? '1' : '0'} onClick={() => setTab('exams')}>
                    <FlaskConical size={16} />
                    {t.profile.examsTitle || 'Exámenes'}
                    <span className="pill-n">{exams.length}</span>
                  </button>
                </div>
                <div style={{ marginLeft: 'auto' }} />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/pets/${id}/${tab === 'checkups' ? 'checkups' : 'exams'}/new`)}
                >
                  <Plus size={16} strokeWidth={2.6} />
                  {tab === 'checkups' ? (t.profile.newCheckup || 'Nueva consulta') : (t.profile.newExam || 'Nuevo examen')}
                </button>
              </div>

              {tab === 'checkups' ? (
                checkups.length > 0 ? (
                  <div className="timeline">
                    {checkups.map((c, i) => (
                      <CheckupCard
                        key={c.id}
                        checkup={c}
                        index={i}
                        onDelete={did => setCheckups(prev => prev.filter(x => x.id !== did))}
                        onUpdate={updated => setCheckups(prev => prev.map(x => x.id === updated.id ? updated : x))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="section-empty">
                    <span className="se-emoji">🩺</span>
                    <h3 className="t-h3" style={{ margin: '0 0 6px' }}>{t.profile.noCheckups || 'Sin consultas aún'}</h3>
                    <p className="t-bodysm" style={{ margin: '0 0 16px' }}>
                      Registra las visitas al veterinario de {pet.name} para construir su historial.
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/pets/${id}/checkups/new`)}>
                      <Plus size={16} /> {t.profile.newCheckup || 'Registrar primera consulta'}
                    </button>
                  </div>
                )
              ) : (
                exams.length > 0 ? (
                  <div className="timeline">
                    {exams.map((e, i) => (
                      <ExamViewer
                        key={e.id}
                        exam={e}
                        index={i}
                        onDelete={did => setExams(prev => prev.filter(x => x.id !== did))}
                        onUpdate={updated => setExams(prev => prev.map(x => x.id === updated.id ? updated : x))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="section-empty">
                    <span className="se-emoji">🔬</span>
                    <h3 className="t-h3" style={{ margin: '0 0 6px' }}>{t.profile.noExams || 'Sin exámenes aún'}</h3>
                    <p className="t-bodysm" style={{ margin: '0 0 16px' }}>
                      Sube resultados de laboratorio e imágenes para tenerlo todo en un lugar.
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/pets/${id}/exams/new`)}>
                      <Plus size={16} /> {t.profile.newExam || 'Agregar primer examen'}
                    </button>
                  </div>
                )
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
