import { useRef, useState } from 'react'
import { ChevronDown, Stethoscope, Pencil, X, Check, Pill, Calendar, Paperclip } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { deleteCheckup, updateCheckup, uploadCheckupAttachment, deleteAttachment } from '../api'

const inputStyle = {
  width: '100%', background: 'var(--surface-3)', border: '1.5px solid var(--border-2)',
  borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '14px', color: 'var(--text)',
  fontFamily: 'var(--f-pet)', outline: 'none', boxSizing: 'border-box',
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function AttachmentsSection({ attachments, setAttachments, entityId, t }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (attachments.length >= 3) { alert(t.checkup.maxFiles); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadCheckupAttachment(entityId, fd)
      setAttachments(prev => [...prev, res.data])
    } catch (err) {
      alert(err.response?.data?.error || t.checkup.uploadError)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(attId) {
    if (!window.confirm(t.checkup.deleteFileConfirm)) return
    try {
      await deleteAttachment(attId)
      setAttachments(prev => prev.filter(a => a.id !== attId))
    } catch {
      alert(t.checkup.deleteFileError)
    }
  }

  if (attachments.length === 0 && attachments.length >= 3) return null

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="t-label muted-3">{t.checkup.attachments}</span>
        {attachments.length < 3 && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-ghost btn-sm"
            >
              <Paperclip size={14} />
              {uploading ? t.checkup.uploading : `+ ${t.checkup.attachBtn}`}
            </button>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic', margin: 0 }}>{t.checkup.noAttachments}</p>
      ) : (
        <div className="attach">
          {attachments.map(att => {
            const ext = att.file_name?.split('.').pop()?.toUpperCase() || 'FILE'
            return (
              <div key={att.id} className="attach-item" style={{ cursor: 'pointer' }} onClick={() => window.open(att.file_url, '_blank')}>
                {att.file_type === 'image' ? (
                  <img src={att.file_url} alt={att.file_name} style={{ width: 30, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                ) : (
                  <div className="fic">{ext}</div>
                )}
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                  {att.file_name}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(att.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0, display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CheckupCard({ checkup, index = 0, onDelete, onUpdate }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attachments, setAttachments] = useState(checkup.attachments || [])
  const [editForm, setEditForm] = useState({
    vet_name: checkup.vet_name || '',
    clinic_name: checkup.clinic_name || '',
    checkup_date: checkup.checkup_date || '',
    reason: checkup.reason || '',
    diagnosis: checkup.diagnosis || '',
    observations: checkup.observations || '',
    next_visit_date: checkup.next_visit_date || '',
  })

  async function handleDelete() {
    if (!window.confirm(t.checkup.deleteConfirm)) return
    setDeleting(true)
    try {
      await deleteCheckup(checkup.id)
      onDelete(checkup.id)
    } catch {
      alert(t.checkup.deleteError)
      setDeleting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await updateCheckup(checkup.id, editForm)
      onUpdate({ ...res.data, attachments })
      setEditing(false)
    } catch (err) {
      alert(err.response?.data?.error || t.checkup.saveError)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditForm({
      vet_name: checkup.vet_name || '',
      clinic_name: checkup.clinic_name || '',
      checkup_date: checkup.checkup_date || '',
      reason: checkup.reason || '',
      diagnosis: checkup.diagnosis || '',
      observations: checkup.observations || '',
      next_visit_date: checkup.next_visit_date || '',
    })
    setEditing(false)
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
              {checkup.medications?.length > 0 && (
                <span className="badge badge-neutral">
                  <Pill size={12} /> {checkup.medications.length} {checkup.medications.length === 1 ? 'med' : 'meds'}
                </span>
              )}
              {attachments.length > 0 && (
                <span className="badge badge-neutral">
                  <Paperclip size={12} /> {attachments.length}
                </span>
              )}
            </div>
            <div className="r2">
              <span><Calendar size={13} /> {formatDate(checkup.checkup_date)}</span>
              {checkup.vet_name && <><span>·</span><span>Dr. {checkup.vet_name}</span></>}
              {checkup.clinic_name && <><span>·</span><span>{checkup.clinic_name}</span></>}
            </div>
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
                    <LabelInput label={t.addCheckup?.vet || 'Veterinario'} value={editForm.vet_name} onChange={v => setField('vet_name', v)} />
                    <LabelInput label={t.addCheckup?.clinic || 'Clínica'} value={editForm.clinic_name} onChange={v => setField('clinic_name', v)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <LabelInput label={t.addCheckup?.date || 'Fecha'} type="date" value={editForm.checkup_date} onChange={v => setField('checkup_date', v)} />
                    <LabelInput label={t.addCheckup?.nextVisit || 'Próxima visita'} type="date" value={editForm.next_visit_date} onChange={v => setField('next_visit_date', v)} />
                  </div>
                  <LabelInput label={t.checkup.reason} textarea value={editForm.reason} onChange={v => setField('reason', v)} />
                  <LabelInput label={t.checkup.diagnosis} textarea value={editForm.diagnosis} onChange={v => setField('diagnosis', v)} />
                  <LabelInput label={t.checkup.observations} textarea rows={3} value={editForm.observations} onChange={v => setField('observations', v)} />

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={handleCancel} className="btn btn-ghost btn-sm">
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
                        <div className="k">{t.addCheckup?.clinic || 'Clínica'}</div>
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
                        <strong>{t.checkup.nextVisit}</strong> {formatDate(checkup.next_visit_date)}
                      </span>
                    </div>
                  )}

                  {checkup.medications?.length > 0 && (
                    <div className="med-list">
                      {checkup.medications.map(med => (
                        <div className="med" key={med.id}>
                          <div className="mic"><Pill size={16} /></div>
                          <div style={{ flex: 1 }}>
                            <div className="mname">{med.name}{med.concentration && ` (${med.concentration})`}</div>
                            <div className="mdose">
                              {med.frequency}
                              {med.duration_days && ` · ${med.duration_days} ${t.common.days}`}
                              {med.notes && ` · ${med.notes}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rec-actions">
                    <button
                      onClick={() => setEditing(true)}
                      className="btn btn-ghost btn-sm"
                    >
                      <Pencil size={14} /> {t.checkup.editBtn}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="btn btn-danger btn-sm"
                    >
                      {deleting ? t.common.deleting : t.checkup.deleteBtn}
                    </button>
                  </div>
                </>
              )}

              <AttachmentsSection
                attachments={attachments}
                setAttachments={setAttachments}
                entityId={checkup.id}
                t={t}
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
