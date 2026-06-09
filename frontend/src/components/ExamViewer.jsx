import { useRef, useState } from 'react'
import { ChevronDown, FlaskConical, Pencil, X, Check, Paperclip, Calendar } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { deleteExam, updateExam, uploadExamAttachment, deleteAttachment } from '../api'

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
    if (attachments.length >= 3) { alert(t.exam.maxFiles); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadExamAttachment(entityId, fd)
      setAttachments(prev => [...prev, res.data])
    } catch (err) {
      alert(err.response?.data?.error || t.exam.uploadError)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(attId) {
    if (!window.confirm(t.exam.deleteFileConfirm)) return
    try {
      await deleteAttachment(attId)
      setAttachments(prev => prev.filter(a => a.id !== attId))
    } catch {
      alert(t.exam.deleteFileError)
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="t-label muted-3">{t.exam.attachments}</span>
        {attachments.length < 3 && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleUpload} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn btn-ghost btn-sm">
              <Paperclip size={14} />
              {uploading ? t.exam.uploading : `+ ${t.exam.attachBtn}`}
            </button>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic', margin: 0 }}>{t.exam.noAttachments}</p>
      ) : (
        <div className="attach">
          {attachments.map(att => {
            const ext = att.file_name?.split('.').pop()?.toUpperCase() || 'FILE'
            return (
              <div key={att.id} className="attach-item" style={{ cursor: 'pointer' }} onClick={() => window.open(att.file_url, '_blank')}>
                {att.file_type === 'image'
                  ? <img src={att.file_url} alt={att.file_name} style={{ width: 30, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                  : <div className="fic">{ext}</div>
                }
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

export default function ExamViewer({ exam, index = 0, onDelete, onUpdate }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attachments, setAttachments] = useState(exam.attachments || [])
  const [editForm, setEditForm] = useState({
    exam_type: exam.exam_type || '',
    exam_date: exam.exam_date || '',
    lab_name: exam.lab_name || '',
    notes: exam.notes || '',
  })

  async function handleDelete() {
    if (!window.confirm(t.exam.deleteConfirm)) return
    setDeleting(true)
    try {
      await deleteExam(exam.id)
      onDelete(exam.id)
    } catch {
      alert(t.exam.deleteError)
      setDeleting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await updateExam(exam.id, editForm)
      onUpdate({ ...res.data, attachments })
      setEditing(false)
    } catch (err) {
      alert(err.response?.data?.error || t.exam.saveError)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditForm({ exam_type: exam.exam_type || '', exam_date: exam.exam_date || '', lab_name: exam.lab_name || '', notes: exam.notes || '' })
    setEditing(false)
  }

  function setField(k, v) { setEditForm(f => ({ ...f, [k]: v })) }

  const toggle = () => { setOpen(o => !o); if (editing) setEditing(false) }

  return (
    <div className="tl-item" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="tl-dot is-exam">
        <FlaskConical size={10} style={{ color: 'var(--accent-ink)' }} />
      </div>

      <div className="rec" data-open={open ? '1' : '0'}>
        {/* Header */}
        <div className="rec-head" onClick={toggle}>
          <div className="rec-ic exam">
            <FlaskConical size={20} />
          </div>
          <div className="rec-ttl">
            <div className="r1">
              <h4>{exam.exam_type}</h4>
              {attachments.length > 0 && (
                <span className="badge badge-neutral"><Paperclip size={12} /> {attachments.length}</span>
              )}
              {exam.pdf_url && <span className="badge badge-neutral">PDF</span>}
            </div>
            <div className="r2">
              <span><Calendar size={13} /> {formatDate(exam.exam_date)}</span>
              {exam.lab_name && <><span>·</span><span>{exam.lab_name}</span></>}
            </div>
          </div>
          <ChevronDown size={20} className="rec-chev" />
        </div>

        {/* Body */}
        <div className="rec-body">
          <div>
            <div className="rec-inner rec-inner-pad">
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <LabelInput label={t.addExam?.examType || 'Tipo de examen'} value={editForm.exam_type} onChange={v => setField('exam_type', v)} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <LabelInput label={t.addExam?.date || 'Fecha'} type="date" value={editForm.exam_date} onChange={v => setField('exam_date', v)} />
                    <LabelInput label={t.addExam?.lab || 'Laboratorio'} value={editForm.lab_name} onChange={v => setField('lab_name', v)} />
                  </div>
                  <LabelInput label={t.exam.notes} textarea value={editForm.notes} onChange={v => setField('notes', v)} />

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={handleCancel} className="btn btn-ghost btn-sm">
                      <X size={14} /> {t.exam.cancelBtn}
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                      <Check size={14} /> {saving ? t.common.saving : t.exam.saveBtn}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {exam.pdf_url && (
                    <button onClick={() => window.open(exam.pdf_url, '_blank')} className="btn btn-outline btn-sm" style={{ marginBottom: 12 }}>
                      {t.exam.viewPdf}
                    </button>
                  )}

                  {exam.notes && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="k" style={{ font: '800 10.5px/1 var(--f-pet)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
                        {t.exam.notes}
                      </div>
                      <p className="t-bodysm muted" style={{ margin: 0, fontStyle: 'italic' }}>{exam.notes}</p>
                    </div>
                  )}

                  {exam.exam_values?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p className="t-label muted-3" style={{ margin: '0 0 10px' }}>{t.exam.results}</p>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-2)' }}>
                              {[t.exam.param, t.exam.value, t.exam.unit, t.exam.range, t.exam.status].map(h => (
                                <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {exam.exam_values.map(val => (
                              <tr key={val.id} style={{ background: val.is_abnormal ? 'var(--danger-soft)' : 'transparent', borderTop: '1px solid var(--border)' }}>
                                <td style={{ padding: '7px 10px', fontWeight: 600 }}>{val.parameter_name}</td>
                                <td style={{ padding: '7px 10px', fontWeight: 700 }}>{val.value}</td>
                                <td style={{ padding: '7px 10px', color: 'var(--text-3)' }}>{val.unit || '—'}</td>
                                <td style={{ padding: '7px 10px', color: 'var(--text-3)' }}>{val.reference_range || '—'}</td>
                                <td style={{ padding: '7px 10px' }}>
                                  {val.is_abnormal
                                    ? <span className="badge badge-danger" style={{ background: 'var(--danger-soft)', color: 'var(--danger-ink)', fontSize: 11 }}>{t.exam.abnormal}</span>
                                    : <span className="badge" style={{ background: 'var(--success-soft)', color: 'var(--success-ink)', fontSize: 11 }}>{t.exam.normal}</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="rec-actions">
                    <button onClick={() => { setOpen(true); setEditing(true) }} className="btn btn-ghost btn-sm">
                      <Pencil size={14} /> {t.exam.editBtn}
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="btn btn-danger btn-sm">
                      {deleting ? t.common.deleting : t.exam.deleteBtn}
                    </button>
                  </div>
                </>
              )}

              <AttachmentsSection
                attachments={attachments}
                setAttachments={setAttachments}
                entityId={exam.id}
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
