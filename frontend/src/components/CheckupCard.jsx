import { useState } from 'react'
import { ChevronDown, Stethoscope, Pencil, X, Check, Pill, Calendar, Paperclip } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import {
  deleteCheckup, updateCheckup, uploadCheckupAttachment,
  createMedication, updateMedication, deleteMedication,
} from '../api'
import { formatDate, relativeDate, todayISO } from '../utils/format'
import Attachments from './Attachments'
import MedicationForm, { toMedicationDraft, medicationPayload, validateMedications } from './MedicationForm'
import { useFeedback } from '../context/FeedbackContext'

const inputStyle = {
  width: '100%', background: 'var(--surface-3)', border: '1.5px solid var(--border-2)',
  borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '14px', color: 'var(--text)',
  fontFamily: 'var(--f-pet)', outline: 'none', boxSizing: 'border-box',
}

function formFromCheckup(checkup) {
  return {
    vet_name: checkup.vet_name || '',
    clinic_name: checkup.clinic_name || '',
    checkup_date: checkup.checkup_date || '',
    reason: checkup.reason || '',
    diagnosis: checkup.diagnosis || '',
    observations: checkup.observations || '',
    next_visit_date: checkup.next_visit_date || '',
  }
}

// Aplica en el backend las diferencias entre los medicamentos originales y los borradores
async function syncMedications(checkupId, original, drafts) {
  const keptIds = new Set(drafts.filter(d => d.id).map(d => d.id))
  await Promise.all(original.filter(m => !keptIds.has(m.id)).map(m => deleteMedication(m.id)))

  const byId = Object.fromEntries(original.map(m => [m.id, m]))
  const saved = []
  for (const draft of drafts) {
    const payload = medicationPayload(draft)
    if (!draft.id) {
      saved.push((await createMedication(checkupId, payload)).data)
      continue
    }
    const prev = byId[draft.id]
    const changed = Object.keys(payload).some(k => (payload[k] ?? null) !== (prev[k] ?? null))
    saved.push(changed ? (await updateMedication(draft.id, payload)).data : prev)
  }
  return saved
}

export default function CheckupCard({ checkup, index = 0, canEdit = true, onDelete, onUpdate }) {
  const { t, lang } = useLanguage()
  const { askConfirm, toast } = useFeedback()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attachments, setAttachments] = useState(checkup.attachments || [])
  const [editForm, setEditForm] = useState(() => formFromCheckup(checkup))
  const [medDrafts, setMedDrafts] = useState([])
  const [medErrors, setMedErrors] = useState({})

  const medications = checkup.medications || []
  const upcomingVisit = checkup.next_visit_date && checkup.next_visit_date >= todayISO()

  function startEditing() {
    setEditForm(formFromCheckup(checkup))
    setMedDrafts(medications.map(toMedicationDraft))
    setMedErrors({})
    setEditing(true)
  }

  async function handleDelete() {
    if (!await askConfirm(t.checkup.deleteConfirm)) return
    setDeleting(true)
    try {
      await deleteCheckup(checkup.id)
      onDelete(checkup.id)
    } catch {
      toast(t.checkup.deleteError)
      setDeleting(false)
    }
  }

  async function handleSave() {
    const me = validateMedications(medDrafts, t)
    setMedErrors(me)
    if (Object.keys(me).length) return
    setSaving(true)
    try {
      const res = await updateCheckup(checkup.id, editForm)
      const savedMeds = await syncMedications(checkup.id, medications, medDrafts)
      onUpdate({ ...res.data, medications: savedMeds, attachments })
      setEditing(false)
    } catch (err) {
      toast(err.response?.data?.error || t.checkup.saveError)
    } finally {
      setSaving(false)
    }
  }

  function setField(k, v) { setEditForm(f => ({ ...f, [k]: v })) }

  const toggle = () => { setOpen(o => !o); if (editing) setEditing(false) }

  return (
    <div className="tl-item" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="tl-dot">
        <Stethoscope size={10} style={{ color: 'var(--primary-ink)' }} />
      </div>

      <div className="rec" data-open={open ? '1' : '0'}>
        {/* Header */}
        <div className="rec-head" onClick={toggle}>
          <div className="rec-ic check">
            <Stethoscope size={20} />
          </div>
          <div className="rec-ttl">
            <div className="r1">
              <h4>{checkup.reason || t.checkup.noReason}</h4>
              {medications.length > 0 && (
                <span className="badge badge-neutral">
                  <Pill size={12} /> {medications.length} {medications.length === 1 ? t.checkup.medOne : t.checkup.medMany}
                </span>
              )}
              {attachments.length > 0 && (
                <span className="badge badge-neutral">
                  <Paperclip size={12} /> {attachments.length}
                </span>
              )}
            </div>
            <div className="r2">
              <span><Calendar size={13} /> {formatDate(checkup.checkup_date, lang)}</span>
              {checkup.vet_name && <><span>·</span><span>{t.checkup.doctor} {checkup.vet_name}</span></>}
              {checkup.clinic_name && <><span>·</span><span>{checkup.clinic_name}</span></>}
            </div>
            {!open && (checkup.diagnosis || upcomingVisit) && (
              <div className="r3">
                {checkup.diagnosis && <span className="r3-dx"><span className="r3-k">{t.checkup.diagnosis}</span> {checkup.diagnosis}</span>}
                {upcomingVisit && (
                  <span className="status status-soon"><Calendar size={12} /> {t.checkup.nextVisit} {formatDate(checkup.next_visit_date, lang)} · {relativeDate(checkup.next_visit_date, lang)}</span>
                )}
              </div>
            )}
          </div>
          <ChevronDown size={20} className="rec-chev" />
        </div>

        {/* Body */}
        <div className="rec-body">
          <div>
            <div className="rec-inner rec-inner-pad">
              {editing ? (
                /* Edit form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <LabelInput label={t.addCheckup.vet} value={editForm.vet_name} onChange={v => setField('vet_name', v)} />
                    <LabelInput label={t.addCheckup.clinic} value={editForm.clinic_name} onChange={v => setField('clinic_name', v)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <LabelInput label={t.addCheckup.date} type="date" value={editForm.checkup_date} onChange={v => setField('checkup_date', v)} />
                    <LabelInput label={t.addCheckup.nextVisit} type="date" value={editForm.next_visit_date} onChange={v => setField('next_visit_date', v)} />
                  </div>
                  <LabelInput label={t.checkup.reason} textarea value={editForm.reason} onChange={v => setField('reason', v)} />
                  <LabelInput label={t.checkup.diagnosis} textarea value={editForm.diagnosis} onChange={v => setField('diagnosis', v)} />
                  <LabelInput label={t.checkup.observations} textarea rows={3} value={editForm.observations} onChange={v => setField('observations', v)} />

                  <div>
                    <div className="t-label muted-3" style={{ marginBottom: 8 }}>{t.addCheckup.medsTitle}</div>
                    <MedicationForm medications={medDrafts} onChange={setMedDrafts} errors={medErrors} compact />
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
                      <X size={14} /> {t.checkup.cancelBtn}
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                      <Check size={14} /> {saving ? t.common.saving : t.checkup.saveBtn}
                    </button>
                  </div>
                </div>
              ) : (
                /* Read-only */
                <>
                  <div className="kv">
                    {checkup.diagnosis && (
                      <div>
                        <div className="k">{t.checkup.diagnosis}</div>
                        <div className="v">{checkup.diagnosis}</div>
                      </div>
                    )}
                    {checkup.clinic_name && (
                      <div>
                        <div className="k">{t.addCheckup.clinic}</div>
                        <div className="v">{checkup.clinic_name}</div>
                      </div>
                    )}
                  </div>

                  {checkup.observations && (
                    <div style={{ marginTop: 14 }}>
                      <div className="k" style={{ font: '800 10.5px/1 var(--f-pet)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
                        {t.checkup.observations}
                      </div>
                      <p className="t-bodysm muted" style={{ margin: 0 }}>{checkup.observations}</p>
                    </div>
                  )}

                  {checkup.next_visit_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                      <Calendar size={14} style={{ color: 'var(--accent-ink)' }} />
                      <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
                        <strong>{t.checkup.nextVisit}</strong> {formatDate(checkup.next_visit_date, lang)}
                      </span>
                    </div>
                  )}

                  {medications.length > 0 && (
                    <div className="med-list">
                      {medications.map(med => (
                        <div className="med" key={med.id}>
                          <div className="mic"><Pill size={16} /></div>
                          <div style={{ flex: 1 }}>
                            <div className="mname">{med.name}{med.concentration && ` (${med.concentration})`}</div>
                            <div className="mdose">
                              {med.frequency}
                              {med.duration_days != null && ` · ${med.duration_days} ${t.common.days}`}
                              {med.notes && ` · ${med.notes}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {canEdit && <div className="rec-actions">
                    <button onClick={startEditing} className="btn btn-ghost btn-sm">
                      <Pencil size={14} /> {t.checkup.editBtn}
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="btn btn-danger btn-sm">
                      {deleting ? t.common.deleting : t.checkup.deleteBtn}
                    </button>
                  </div>}
                </>
              )}

              <Attachments
                attachments={attachments}
                setAttachments={setAttachments}
                upload={fd => uploadCheckupAttachment(checkup.id, fd)}
                labels={t.checkup}
                canEdit={canEdit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LabelInput({ label, value, onChange, type = 'text', textarea = false, rows = 2 }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </label>
      {textarea
        ? <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={rows} value={value} onChange={e => onChange(e.target.value)} />
        : <input style={inputStyle} type={type} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  )
}
