import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Calendar, Pencil, X, Check } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { deleteCheckup, updateCheckup, uploadCheckupAttachment, deleteAttachment } from '../api'

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

  return (
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t.checkup.attachments}
        </span>
        {attachments.length < 3 && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px 10px', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: 'var(--text-secondary)' }}
            >
              {uploading ? t.checkup.uploading : `+ ${t.checkup.attachBtn}`}
            </button>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>{t.checkup.noAttachments}</p>
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

export default function CheckupCard({ checkup, onDelete, onUpdate }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
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

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--color-primary)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', flexWrap: 'wrap' }}>
        <span onClick={() => { setExpanded(e => !e); setEditing(false) }} style={{ color: 'var(--text-muted)', flexShrink: 0, cursor: 'pointer' }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>

        <div onClick={() => { setExpanded(e => !e); setEditing(false) }} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{formatDate(checkup.checkup_date)}</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Dr. {checkup.vet_name}</span>
            {checkup.clinic_name && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>· {checkup.clinic_name}</span>}
          </div>
        </div>

        <span style={{ background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
          {checkup.reason}
        </span>

        {/* Edit toggle */}
        <button
          onClick={() => { setExpanded(true); setEditing(e => !e) }}
          title={t.checkup.editBtn}
          style={{ background: editing ? 'color-mix(in srgb, var(--color-primary) 14%, transparent)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', color: editing ? 'var(--color-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {editing ? (
              /* ── Edit form ── */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <LabelInput label={t.addCheckup?.vet || 'Veterinario'} value={editForm.vet_name} onChange={v => setField('vet_name', v)} />
                  <LabelInput label={t.addCheckup?.clinic || 'Clínica'} value={editForm.clinic_name} onChange={v => setField('clinic_name', v)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <LabelInput label={t.addCheckup?.date || 'Fecha'} type="date" value={editForm.checkup_date} onChange={v => setField('checkup_date', v)} />
                  <LabelInput label={t.addCheckup?.nextVisit || 'Próxima visita'} type="date" value={editForm.next_visit_date} onChange={v => setField('next_visit_date', v)} />
                </div>
                <LabelInput label={t.checkup.reason} textarea value={editForm.reason} onChange={v => setField('reason', v)} />
                <LabelInput label={t.checkup.diagnosis} textarea value={editForm.diagnosis} onChange={v => setField('diagnosis', v)} />
                <LabelInput label={t.checkup.observations} textarea rows={3} value={editForm.observations} onChange={v => setField('observations', v)} />

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={handleCancel} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <X size={13} /> {t.checkup.cancelBtn}
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} /> {saving ? t.common.saving : t.checkup.saveBtn}
                  </button>
                </div>
              </>
            ) : (
              /* ── Read-only view ── */
              <>
                <Field label={t.checkup.reason} value={checkup.reason} />
                {checkup.diagnosis && <Field label={t.checkup.diagnosis} value={checkup.diagnosis} />}
                {checkup.observations && <Field label={t.checkup.observations} value={checkup.observations} />}

                {checkup.next_visit_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="var(--color-accent)" />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <strong>{t.checkup.nextVisit}</strong> {formatDate(checkup.next_visit_date)}
                    </span>
                  </div>
                )}

                {checkup.medications?.length > 0 && (
                  <div>
                    <p style={{ margin: '4px 0 8px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t.checkup.meds}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {checkup.medications.map(med => (
                        <div key={med.id} style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '8px 12px', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{med.name}</strong>
                          {med.concentration && ` (${med.concentration})`}
                          {' — '}{med.frequency}
                          {med.duration_days && ` — ${med.duration_days} ${t.common.days}`}
                          {med.notes && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}> · {med.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleDelete} disabled={deleting} style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', color: 'var(--color-danger)', border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)', borderRadius: '8px', padding: '5px 12px', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                    🗑️ {deleting ? t.common.deleting : t.checkup.deleteBtn}
                  </button>
                </div>
              </>
            )}

            {/* Attachments — always visible when expanded */}
            <AttachmentsSection
              attachments={attachments}
              setAttachments={setAttachments}
              entityId={checkup.id}
              t={t}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

function LabelInput({ label, value, onChange, type = 'text', textarea = false, rows = 2 }) {
  const style = { ...inputStyle }
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {textarea
        ? <textarea style={{ ...style, resize: 'vertical' }} rows={rows} value={value} onChange={e => onChange(e.target.value)} />
        : <input style={style} type={type} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  )
}
