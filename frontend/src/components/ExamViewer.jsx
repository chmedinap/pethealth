import { useState } from 'react'
import { ChevronDown, FlaskConical, Pencil, X, Check, Paperclip, Calendar, Plus, Trash2, TrendingUp } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import {
  deleteExam, updateExam, uploadExamAttachment,
  createExamValues, updateExamValue, deleteExamValue,
} from '../api'
import { formatDate } from '../utils/format'
import Attachments from './Attachments'
import { normalizeParam } from '../utils/labs'

const inputStyle = {
  width: '100%', background: 'var(--surface-3)', border: '1.5px solid var(--border-2)',
  borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '14px', color: 'var(--text)',
  fontFamily: 'var(--f-pet)', outline: 'none', boxSizing: 'border-box',
}

let valueCounter = 0

function toValueDraft(v) {
  return {
    key: v.id ? `val-${v.id}` : `new-${++valueCounter}`,
    id: v.id,
    parameter_name: v.parameter_name || '',
    value: v.value ?? '',
    unit: v.unit || '',
    reference_range: v.reference_range || '',
    is_abnormal: !!v.is_abnormal,
  }
}

function valuePayload(d) {
  return {
    parameter_name: d.parameter_name.trim(),
    value: String(d.value).trim(),
    unit: d.unit.trim() || null,
    reference_range: d.reference_range.trim() || null,
    is_abnormal: d.is_abnormal ? 1 : 0,
  }
}

// Aplica en el backend las diferencias entre los valores originales y los borradores
async function syncValues(examId, original, drafts) {
  const keptIds = new Set(drafts.filter(d => d.id).map(d => d.id))
  await Promise.all(original.filter(v => !keptIds.has(v.id)).map(v => deleteExamValue(v.id)))

  const byId = Object.fromEntries(original.map(v => [v.id, v]))
  const created = drafts.filter(d => !d.id)
  const createdRows = created.length ? (await createExamValues(examId, created.map(valuePayload))).data : []

  const saved = []
  let ci = 0
  for (const d of drafts) {
    if (!d.id) { saved.push(createdRows[ci++]); continue }
    const payload = valuePayload(d)
    const prev = byId[d.id]
    const changed = Object.keys(payload).some(k => (payload[k] ?? null) !== (prev[k] ?? null))
    saved.push(changed ? (await updateExamValue(d.id, payload)).data : prev)
  }
  return saved
}

function ExamValuesEditor({ values, onChange, errors, t }) {
  const ta = t.addExam
  function update(key, field, val) {
    onChange(values.map(v => (v.key === key ? { ...v, [field]: val } : v)))
  }
  return (
    <div>
      {values.map(v => (
        <div className="med-row compact" key={v.key}>
          <div className="field">
            <label>{ta.colParam}</label>
            <input className="input" placeholder={ta.paramPlaceholder} value={v.parameter_name} onChange={e => update(v.key, 'parameter_name', e.target.value)} />
            {errors[v.key]?.parameter_name && <span style={{ fontSize: 12, color: 'var(--danger-ink)', fontWeight: 700 }}>{ta.paramRequired}</span>}
          </div>
          <div className="field">
            <label>{ta.colValue}</label>
            <input className="input" placeholder={ta.valuePlaceholder} value={v.value} onChange={e => update(v.key, 'value', e.target.value)} />
            {errors[v.key]?.value && <span style={{ fontSize: 12, color: 'var(--danger-ink)', fontWeight: 700 }}>{ta.paramRequired}</span>}
          </div>
          <div className="field">
            <label>{ta.colUnit}</label>
            <input className="input" placeholder="mg/dL" value={v.unit} onChange={e => update(v.key, 'unit', e.target.value)} />
          </div>
          <button type="button" className="del" onClick={() => onChange(values.filter(x => x.key !== v.key))} title={ta.valueRemove} aria-label={ta.valueRemove}>
            <Trash2 size={18} />
          </button>
          <div className="med-extra" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
            <div className="field">
              <label>{ta.colRange}</label>
              <input className="input" placeholder="70–110" value={v.reference_range} onChange={e => update(v.key, 'reference_range', e.target.value)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--danger-ink)', cursor: 'pointer', paddingBottom: 10 }}>
              <input type="checkbox" checked={v.is_abnormal} onChange={e => update(v.key, 'is_abnormal', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--danger)' }} />
              {ta.abnormalLabel}
            </label>
          </div>
        </div>
      ))}
      <button type="button" className="add-med" onClick={() => onChange([...values, toValueDraft({})])}>
        <Plus size={18} strokeWidth={2.6} /> {ta.valuesAdd}
      </button>
    </div>
  )
}

export default function ExamViewer({ exam, index = 0, canEdit = true, paramCounts = {}, onShowTrend, onDelete, onUpdate }) {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attachments, setAttachments] = useState(exam.attachments || [])
  const [editForm, setEditForm] = useState({})
  const [valueDrafts, setValueDrafts] = useState([])
  const [valueErrors, setValueErrors] = useState({})

  const examValues = exam.exam_values || []

  function startEditing() {
    setEditForm({ exam_type: exam.exam_type || '', exam_date: exam.exam_date || '', lab_name: exam.lab_name || '', notes: exam.notes || '' })
    setValueDrafts(examValues.map(toValueDraft))
    setValueErrors({})
    setOpen(true)
    setEditing(true)
  }

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
    const errs = {}
    for (const d of valueDrafts) {
      const e = {}
      if (!d.parameter_name.trim()) e.parameter_name = true
      if (!String(d.value).trim()) e.value = true
      if (Object.keys(e).length) errs[d.key] = e
    }
    setValueErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      const res = await updateExam(exam.id, editForm)
      const savedValues = await syncValues(exam.id, examValues, valueDrafts)
      onUpdate({ ...res.data, exam_values: savedValues, attachments })
      setEditing(false)
    } catch (err) {
      alert(err.response?.data?.error || t.exam.saveError)
    } finally {
      setSaving(false)
    }
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
              <span><Calendar size={13} /> {formatDate(exam.exam_date, lang)}</span>
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
                  <LabelInput label={t.addExam.examType} value={editForm.exam_type} onChange={v => setField('exam_type', v)} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <LabelInput label={t.addExam.date} type="date" value={editForm.exam_date} onChange={v => setField('exam_date', v)} />
                    <LabelInput label={t.addExam.lab} value={editForm.lab_name} onChange={v => setField('lab_name', v)} />
                  </div>
                  <LabelInput label={t.exam.notes} textarea value={editForm.notes} onChange={v => setField('notes', v)} />

                  <div>
                    <div className="t-label muted-3" style={{ marginBottom: 8 }}>{t.exam.valuesTitle}</div>
                    <ExamValuesEditor values={valueDrafts} onChange={setValueDrafts} errors={valueErrors} t={t} />
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
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
                    <button onClick={() => window.open(exam.pdf_url, '_blank', 'noopener')} className="btn btn-outline btn-sm" style={{ marginBottom: 12 }}>
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

                  {examValues.length > 0 && (
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
                            {examValues.map(val => (
                              <tr key={val.id} style={{ background: val.is_abnormal ? 'var(--danger-soft)' : 'transparent', borderTop: '1px solid var(--border)' }}>
                                <td style={{ padding: '7px 10px', fontWeight: 600 }}>
                                  {/* Solo es útil ver la evolución si el parámetro aparece en más de un examen */}
                                  {onShowTrend && paramCounts[normalizeParam(val.parameter_name)] > 1 ? (
                                    <button className="param-btn" onClick={() => onShowTrend(val.parameter_name)} title={t.labTrend.open}>
                                      {val.parameter_name} <TrendingUp size={13} aria-label={t.labTrend.open} />
                                    </button>
                                  ) : val.parameter_name}
                                </td>
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

                  {canEdit && <div className="rec-actions">
                    <button onClick={startEditing} className="btn btn-ghost btn-sm">
                      <Pencil size={14} /> {t.exam.editBtn}
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="btn btn-danger btn-sm">
                      {deleting ? t.common.deleting : t.exam.deleteBtn}
                    </button>
                  </div>}
                </>
              )}

              <Attachments
                attachments={attachments}
                setAttachments={setAttachments}
                upload={fd => uploadExamAttachment(exam.id, fd)}
                labels={t.exam}
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
