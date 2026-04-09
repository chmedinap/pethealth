import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, FlaskConical, Pencil, X, Check } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { deleteExam, updateExam, uploadExamAttachment, deleteAttachment } from '../api'

const inputStyle = {
  width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
  borderRadius: '8px', padding: '7px 10px', fontSize: '0.85rem', color: 'var(--text-primary)',
  fontFamily: 'Nunito, sans-serif', outline: 'none', boxSizing: 'border-box',
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
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t.exam.attachments}
        </span>
        {attachments.length < 3 && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px 10px', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: 'var(--text-secondary)' }}
            >
              {uploading ? t.exam.uploading : `+ ${t.exam.attachBtn}`}
            </button>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>{t.exam.noAttachments}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {attachments.map(att => (
            <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '7px 10px' }}>
              {att.file_type === 'image' ? (
                <img
                  src={att.file_url}
                  alt={att.file_name}
                  style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => window.open(att.file_url, '_blank')}
                />
              ) : (
                <span style={{ fontSize: '1.4rem', flexShrink: 0, cursor: 'pointer' }} onClick={() => window.open(att.file_url, '_blank')}>📄</span>
              )}
              <span
                onClick={() => window.open(att.file_url, '_blank')}
                style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border-color)' }}
              >
                {att.file_name}
              </span>
              <button onClick={() => handleDelete(att.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', flexShrink: 0, padding: '2px' }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExamViewer({ exam, onDelete, onUpdate }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
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

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--color-accent)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', flexWrap: 'wrap' }}>
        <FlaskConical size={17} color="var(--color-accent)" strokeWidth={2.2} style={{ flexShrink: 0 }} />

        <div onClick={() => { setExpanded(e => !e); setEditing(false) }} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{exam.exam_type}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatDate(exam.exam_date)}</span>
            {exam.lab_name && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>· {exam.lab_name}</span>}
          </div>
        </div>

        {exam.pdf_url && (
          <span style={{ background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)', color: 'var(--color-accent)', fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', flexShrink: 0 }}>PDF</span>
        )}

        {/* Edit toggle */}
        <button
          onClick={() => { setExpanded(true); setEditing(e => !e) }}
          title={t.exam.editBtn}
          style={{ background: editing ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', color: editing ? 'var(--color-accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        >
          <Pencil size={13} />
        </button>

        <span onClick={() => { setExpanded(e => !e); setEditing(false) }} style={{ color: 'var(--text-muted)', flexShrink: 0, cursor: 'pointer' }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {editing ? (
              /* ── Edit form ── */
              <>
                <LabelInput label={t.addExam?.examType || 'Tipo de examen'} value={editForm.exam_type} onChange={v => setField('exam_type', v)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <LabelInput label={t.addExam?.date || 'Fecha'} type="date" value={editForm.exam_date} onChange={v => setField('exam_date', v)} />
                  <LabelInput label={t.addExam?.lab || 'Laboratorio'} value={editForm.lab_name} onChange={v => setField('lab_name', v)} />
                </div>
                <LabelInput label={t.exam.notes} textarea value={editForm.notes} onChange={v => setField('notes', v)} />

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={handleCancel} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <X size={13} /> {t.exam.cancelBtn}
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ background: 'var(--color-accent)', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} /> {saving ? t.common.saving : t.exam.saveBtn}
                  </button>
                </div>
              </>
            ) : (
              /* ── Read-only view ── */
              <>
                {exam.pdf_url && (
                  <button onClick={() => window.open(exam.pdf_url, '_blank')} style={{ alignSelf: 'flex-start', background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)', border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)', borderRadius: '8px', padding: '7px 14px', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer' }}>
                    {t.exam.viewPdf}
                  </button>
                )}

                {exam.notes && (
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.exam.notes}</span>
                    <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>{exam.notes}</p>
                  </div>
                )}

                {exam.exam_values?.length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t.exam.results}</p>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)' }}>
                            {[t.exam.param, t.exam.value, t.exam.unit, t.exam.range, t.exam.status].map(h => (
                              <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {exam.exam_values.map(val => (
                            <tr key={val.id} style={{ background: val.is_abnormal ? 'color-mix(in srgb, var(--color-danger) 8%, transparent)' : 'transparent', borderTop: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '7px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{val.parameter_name}</td>
                              <td style={{ padding: '7px 10px', color: 'var(--text-primary)', fontWeight: 700 }}>{val.value}</td>
                              <td style={{ padding: '7px 10px', color: 'var(--text-muted)' }}>{val.unit || '—'}</td>
                              <td style={{ padding: '7px 10px', color: 'var(--text-muted)' }}>{val.reference_range || '—'}</td>
                              <td style={{ padding: '7px 10px' }}>
                                {val.is_abnormal
                                  ? <span style={{ background: 'color-mix(in srgb, var(--color-danger) 18%, transparent)', color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{t.exam.abnormal}</span>
                                  : <span style={{ background: 'color-mix(in srgb, var(--color-success) 18%, transparent)', color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{t.exam.normal}</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleDelete} disabled={deleting} style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', color: 'var(--color-danger)', border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)', borderRadius: '8px', padding: '5px 12px', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                    🗑️ {deleting ? t.common.deleting : t.exam.deleteBtn}
                  </button>
                </div>
              </>
            )}

            {/* Attachments — always visible when expanded */}
            <AttachmentsSection
              attachments={attachments}
              setAttachments={setAttachments}
              entityId={exam.id}
              t={t}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function LabelInput({ label, value, onChange, type = 'text', textarea = false, rows = 2 }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {textarea
        ? <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={rows} value={value} onChange={e => onChange(e.target.value)} />
        : <input style={inputStyle} type={type} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  )
}
