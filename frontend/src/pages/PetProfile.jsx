import { Fragment, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Share2, Cake, Scale, Syringe, Stethoscope, FlaskConical, Plus,
  Users, FileText, LogOut, Camera, ChevronRight, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import CheckupCard from '../components/CheckupCard'
import ExamViewer from '../components/ExamViewer'
import VaccineList from '../components/VaccineList'
import WeightPanel from '../components/WeightPanel'
import LabTrendDialog from '../components/LabTrendDialog'
import ShareAccessDialog from '../components/ShareAccessDialog'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import {
  getPet, getPetCheckups, getPetExams, getPetVaccines, getPetWeights,
  deletePet, uploadPetPhoto, removePetShare,
} from '../api'
import { calcAge, copyText, formatDate, todayISO } from '../utils/format'
import { speciesMeta, speciesLabel } from '../utils/species'
import { vaccineStatus, latestDoseIds } from '../utils/vaccines'
import { parameterCounts } from '../utils/labs'
import { useFeedback } from '../context/FeedbackContext'

const TABS = ['checkups', 'exams', 'vaccines', 'weight']

// Resumen en texto plano para compartir con el veterinario o la familia
function buildSummary(pet, checkups, exams, vaccines, t, lang) {
  const tp = t.profile
  const lines = [tp.summaryTitle.replace('{name}', pet.name)]
  const basics = [
    speciesLabel(pet.species, t),
    pet.breed,
    calcAge(pet.birth_date, t.common),
    pet.weight_kg != null ? `${pet.weight_kg} ${t.common.kg}` : null,
  ].filter(Boolean)
  lines.push(basics.join(' · '))

  const last = checkups[0]
  if (last) lines.push('', `${tp.lastCheckup}: ${formatDate(last.checkup_date, lang)} — ${last.reason}`)

  const today = todayISO()
  const upcoming = checkups.map(c => c.next_visit_date).filter(d => d && d >= today).sort()[0]
  if (upcoming) lines.push(`${tp.summaryNextVisit}: ${formatDate(upcoming, lang)}`)

  if (last?.medications?.length) {
    lines.push('', `${tp.summaryRecentMeds}:`)
    for (const m of last.medications) {
      lines.push(`• ${m.name}${m.concentration ? ` (${m.concentration})` : ''} — ${m.frequency}`)
    }
  }

  const latest = latestDoseIds(vaccines)
  const current = vaccines.filter(v => latest.has(v.id))
  if (current.length) {
    lines.push('', `${tp.summaryVaccines}:`)
    for (const v of current) {
      const status = vaccineStatus(v)
      const due = v.next_due_date ? ` — ${t.vaccines.nextDueShort} ${formatDate(v.next_due_date, lang)}` : ''
      lines.push(`• ${v.name} (${formatDate(v.date_given, lang)})${due}${status === 'overdue' ? ` ⚠ ${t.vaccines.statusOverdue}` : ''}`)
    }
  }

  const abnormal = (exams[0]?.exam_values || []).filter(v => v.is_abnormal)
  if (abnormal.length) {
    lines.push('', `${tp.summaryAbnormal}:`)
    for (const v of abnormal) {
      lines.push(`• ${v.parameter_name}: ${v.value}${v.unit ? ` ${v.unit}` : ''}${v.reference_range ? ` (ref. ${v.reference_range})` : ''}`)
    }
  }

  if (pet.notes) lines.push('', `${tp.notes}: ${pet.notes}`)
  return lines.join('\n')
}

function Vital({ icon: Icon, label, value, unit, children }) {
  return (
    <div className="vital">
      <div className="vi"><Icon size={16} /></div>
      <div>
        <div className="k">{label}</div>
        {children || <div className="v">{value}{unit && <small> {unit}</small>}</div>}
      </div>
    </div>
  )
}

// Estado de vacunas con texto (no solo ✓ / ⚠)
function VaccineVital({ overdue, total, t }) {
  if (overdue) return <span className="status status-overdue" style={{ marginTop: 2 }}><AlertTriangle size={12} /> {overdue} {t.vaccines.statusOverdue.toLowerCase()}</span>
  if (total) return <span className="status status-ok" style={{ marginTop: 2 }}><CheckCircle2 size={12} /> {t.vaccines.statusOk}</span>
  return <div className="v">—</div>
}

function ActionRow({ icon: Icon, label, onClick, hint }) {
  return (
    <button className="action-row" onClick={onClick}>
      <Icon size={17} className="action-ic" />
      <span className="action-label">{label}</span>
      {hint && <span className="action-hint">{hint}</span>}
      <ChevronRight size={16} className="action-chev" />
    </button>
  )
}

function EmptySection({ emoji, title, sub, action, onAction }) {
  return (
    <div className="section-empty">
      <span className="se-emoji">{emoji}</span>
      <h3 className="t-h3" style={{ margin: '0 0 6px' }}>{title}</h3>
      <p className="t-bodysm" style={{ margin: action ? '0 0 16px' : 0 }}>{sub}</p>
      {action && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>
          <Plus size={16} /> {action}
        </button>
      )}
    </div>
  )
}

export default function PetProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const { t, lang } = useLanguage()
  const { askConfirm, toast } = useFeedback()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'checkups'
  const setTab = next => { setAddRequest(0); setSearchParams(next === 'checkups' ? {} : { tab: next }, { replace: true }) }

  const [pet, setPet] = useState(null)
  const [checkups, setCheckups] = useState([])
  const [exams, setExams] = useState([])
  const [vaccines, setVaccines] = useState([])
  const [weights, setWeights] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [trendParam, setTrendParam] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [addRequest, setAddRequest] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const [petRes, checkupsRes, examsRes, vaccinesRes, weightsRes] = await Promise.all([
          getPet(id), getPetCheckups(id), getPetExams(id), getPetVaccines(id), getPetWeights(id),
        ])
        setPet(petRes.data)
        setCheckups(checkupsRes.data)
        setExams(examsRes.data)
        setVaccines(vaccinesRes.data)
        setWeights(weightsRes.data)
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
    } catch (err) {
      toast(err.response?.data?.error || t.profile.uploadError)
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  async function handleShareSummary() {
    const text = buildSummary(pet, checkups, exams, vaccines, t, lang)
    try {
      if (navigator.share) {
        await navigator.share({ title: t.profile.summaryTitle.replace('{name}', pet.name), text })
      } else {
        await copyText(text)
        toast(t.profile.shareCopied, 'success')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast(t.profile.shareError)
    }
  }

  async function handleDelete() {
    if (!await askConfirm(t.profile.deleteConfirm.replace('{name}', pet.name))) return
    try {
      await deletePet(id)
      navigate('/')
    } catch {
      toast(t.profile.deleteError)
    }
  }

  async function handleLeave() {
    if (!await askConfirm(t.share.leaveConfirm.replace('{name}', pet.name))) return
    try {
      await removePetShare(id, user.id)
      navigate('/')
    } catch {
      toast(t.common.error500)
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

  if (notFound || !pet) return <Navigate to="/" replace />

  const isOwner = pet.access === 'owner'
  const canEdit = isOwner || pet.access === 'editor'
  const meta = speciesMeta(pet.species)
  const genderCls = pet.gender === 'male' ? 'badge-gender-m' : 'badge-gender-f'
  const genderLabel = pet.gender === 'male' ? t.common.male : pet.gender === 'female' ? t.common.female : null
  const paramCounts = parameterCounts(exams)
  const overdueVaccines = vaccines.filter(v => latestDoseIds(vaccines).has(v.id) && vaccineStatus(v) === 'overdue').length

  const tabs = [
    { k: 'checkups', icon: Stethoscope, label: t.profile.checkupsTitle, n: checkups.length },
    { k: 'exams', icon: FlaskConical, label: t.profile.examsTitle, n: exams.length },
    { k: 'vaccines', icon: Syringe, label: t.profile.vaccinesTitle, n: vaccines.length },
    { k: 'weight', icon: Scale, label: t.profile.weightTitle, n: weights.length },
  ]
  const newAction = { checkups: t.profile.newCheckup, exams: t.profile.newExam, vaccines: t.vaccines.add, weight: t.weight.add }[tab]
  // Consultas y exámenes abren su página; vacunas y peso abren el formulario en línea
  const onNewAction = () => (tab === 'checkups' || tab === 'exams' ? navigate(`/pets/${id}/${tab}/new`) : setAddRequest(n => n + 1))

  return (
    <>
      <Navbar />
      <main style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 60, maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
        <div className="screen">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} strokeWidth={2.4} />
            {t.dashboard.title}
          </button>

          <div className="profile-grid">
            {/* ── HERO ── */}
            <aside className="pet-hero">
              <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <div className="hero-photo">
                  {pet.photo_url ? (
                    <div style={{ height: 230 }}>
                      <img src={pet.photo_url} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ) : (
                    <div className="photo" style={{ height: 230, borderRadius: 'var(--r-lg) var(--r-lg) 0 0', '--tint': meta.tint }}>
                      <span className="ph-emoji" style={{ fontSize: '3.5em' }}>{meta.emoji}</span>
                    </div>
                  )}
                  {canEdit && (
                    <>
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={handlePhotoChange} />
                      <button className="photo-btn" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
                        <Camera size={15} /> {uploadingPhoto ? t.profile.uploading : t.profile.changePhoto}
                      </button>
                    </>
                  )}
                </div>

                <div className="pet-hero-body">
                  <h1 className="t-h1">{pet.name}</h1>

                  <div className="pet-badges">
                    <span className={`badge ${meta.badge}`}>
                      <span className="emoji">{meta.emoji}</span>
                      {pet.breed || speciesLabel(pet.species, t)}
                    </span>
                    {genderLabel && (
                      <span className={`badge ${genderCls}`}>
                        {pet.gender === 'male' ? '♂' : '♀'} {genderLabel}
                      </span>
                    )}
                    {!isOwner && (
                      <span className="badge badge-neutral" title={t.share.sharedBy.replace('{owner}', pet.owner_username)}>
                        <Users size={12} /> {pet.access === 'editor' ? t.share.roleEditor : t.share.roleViewer}
                      </span>
                    )}
                  </div>

                  {!isOwner && (
                    <p className="t-bodysm muted" style={{ margin: '0 0 12px' }}>
                      {t.share.sharedBy.replace('{owner}', pet.owner_username)}
                    </p>
                  )}

                  <div className="vitals">
                    <Vital icon={Cake} label={t.profile.age} value={calcAge(pet.birth_date, t.common)} />
                    <Vital icon={Scale} label={t.profile.weight} value={pet.weight_kg != null ? pet.weight_kg.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES') : '—'} unit={pet.weight_kg != null ? t.common.kg : null} />
                    <Vital icon={Stethoscope} label={t.profile.lastCheckup} value={checkups[0] ? formatDate(checkups[0].checkup_date, lang) : '—'} />
                    <Vital icon={Syringe} label={t.profile.vaccinesTitle}>
                      <VaccineVital overdue={overdueVaccines} total={vaccines.length} t={t} />
                    </Vital>
                  </div>

                  {pet.notes && (
                    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '13px 15px', marginBottom: 16 }}>
                      <div className="t-label muted-3" style={{ marginBottom: 6 }}>📝 {t.profile.notes}</div>
                      <p className="t-bodysm muted" style={{ margin: 0 }}>{pet.notes}</p>
                    </div>
                  )}

                  {canEdit && (
                    <button className="btn btn-outline btn-block" onClick={() => navigate(`/pets/${id}/edit`)}>
                      <Pencil size={16} /> {t.profile.editBtn}
                    </button>
                  )}

                  <div className="action-list">
                    <ActionRow icon={Share2} label={t.profile.share} onClick={handleShareSummary} />
                    <ActionRow icon={FileText} label={t.report.open} onClick={() => navigate(`/pets/${id}/report`)} />
                    {isOwner && <ActionRow icon={Users} label={t.share.manage} onClick={() => setSharing(true)} />}
                  </div>

                  <div className="hero-foot">
                    {isOwner
                      ? <button className="link-danger" onClick={handleDelete}>{t.profile.deleteBtn}…</button>
                      : <button className="link-danger" onClick={handleLeave}><LogOut size={14} /> {t.share.leave}</button>}
                  </div>
                </div>
              </div>
            </aside>

            {/* ── RECORDS ── */}
            <section>
              <div className="records-head">
                <div className="tabs" role="tablist">
                  {tabs.map(({ k, icon: Icon, label, n }) => (
                    <button key={k} className="tab" role="tab" aria-selected={tab === k} data-on={tab === k ? '1' : '0'} onClick={() => setTab(k)}>
                      <Icon size={16} />
                      {label}
                      <span className="pill-n">{n}</span>
                    </button>
                  ))}
                </div>
                <div style={{ marginLeft: 'auto' }} />
                {canEdit && newAction && (
                  <button className="btn btn-primary btn-sm" onClick={onNewAction}>
                    <Plus size={16} strokeWidth={2.6} />
                    {newAction}
                  </button>
                )}
              </div>

              {tab === 'checkups' && (checkups.length > 0 ? (
                <div className="timeline">
                  {checkups.map((c, i) => {
                    const year = (c.checkup_date || '').slice(0, 4)
                    const showYear = year && year !== (checkups[i - 1]?.checkup_date || '').slice(0, 4)
                    return (
                    <Fragment key={c.id}>
                    {showYear && <div className="tl-year">{year}</div>}
                    <CheckupCard
                      checkup={c}
                      index={i}
                      canEdit={canEdit}
                      onDelete={did => setCheckups(prev => prev.filter(x => x.id !== did))}
                      onUpdate={updated => setCheckups(prev => prev.map(x => x.id === updated.id ? updated : x))}
                    />
                    </Fragment>
                    )
                  })}
                </div>
              ) : (
                <EmptySection
                  emoji="🩺" title={t.profile.noCheckups} sub={t.profile.noCheckupsSub.replace('{name}', pet.name)}
                  action={canEdit && t.profile.firstCheckup} onAction={() => navigate(`/pets/${id}/checkups/new`)}
                />
              ))}

              {tab === 'exams' && (exams.length > 0 ? (
                <div className="timeline">
                  {exams.map((e, i) => (
                    <ExamViewer
                      key={e.id}
                      exam={e}
                      index={i}
                      canEdit={canEdit}
                      paramCounts={paramCounts}
                      onShowTrend={setTrendParam}
                      onDelete={did => setExams(prev => prev.filter(x => x.id !== did))}
                      onUpdate={updated => setExams(prev => prev.map(x => x.id === updated.id ? updated : x))}
                    />
                  ))}
                </div>
              ) : (
                <EmptySection
                  emoji="🔬" title={t.profile.noExams} sub={t.profile.noExamsSub}
                  action={canEdit && t.profile.firstExam} onAction={() => navigate(`/pets/${id}/exams/new`)}
                />
              ))}

              {tab === 'vaccines' && (
                <VaccineList pet={pet} vaccines={vaccines} setVaccines={setVaccines} canEdit={canEdit} addRequest={addRequest} />
              )}

              {tab === 'weight' && (
                <WeightPanel pet={pet} weights={weights} setWeights={setWeights} canEdit={canEdit} onPetUpdate={setPet} addRequest={addRequest} />
              )}
            </section>
          </div>
        </div>
      </main>

      {trendParam && <LabTrendDialog parameter={trendParam} exams={exams} onClose={() => setTrendParam(null)} />}
      {sharing && <ShareAccessDialog pet={pet} onClose={() => setSharing(false)} />}
    </>
  )
}
