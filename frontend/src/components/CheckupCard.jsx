import { useState } from 'react'
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { deleteCheckup } from '../api'

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export default function CheckupCard({ checkup, onDelete }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--color-primary)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>

      {/* Header */}
      <div onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{formatDate(checkup.checkup_date)}</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Dr. {checkup.vet_name}</span>
            {checkup.clinic_name && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>· {checkup.clinic_name}</span>}
          </div>
        </div>
        <span style={{ background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
          {checkup.reason}
        </span>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

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
                <p style={{ margin: '4px 0 8px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {t.checkup.meds}
                </p>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button onClick={handleDelete} disabled={deleting} style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', color: 'var(--color-danger)', border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)', borderRadius: '8px', padding: '5px 12px', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                🗑️ {deleting ? t.common.deleting : t.checkup.deleteBtn}
              </button>
            </div>
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
