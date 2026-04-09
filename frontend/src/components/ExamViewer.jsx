import { useState } from 'react'
import { ChevronDown, ChevronUp, FlaskConical } from 'lucide-react'
import { deleteExam } from '../api'

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export default function ExamViewer({ exam, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este examen? También se eliminarán sus valores y el PDF asociado.')) return
    setDeleting(true)
    try {
      await deleteExam(exam.id)
      onDelete(exam.id)
    } catch {
      alert('Error al eliminar el examen')
      setDeleting(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '16px',
      border: '1px solid var(--border-color)',
      borderLeft: '4px solid var(--color-accent)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          cursor: 'pointer',
          flexWrap: 'wrap',
        }}
      >
        <FlaskConical size={17} color="var(--color-accent)" strokeWidth={2.2} style={{ flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {exam.exam_type}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {formatDate(exam.exam_date)}
            </span>
            {exam.lab_name && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                · {exam.lab_name}
              </span>
            )}
          </div>
        </div>

        {exam.pdf_url && (
          <span style={{
            background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
            color: 'var(--color-accent)',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: '20px',
            flexShrink: 0,
          }}>
            PDF
          </span>
        )}

        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {exam.pdf_url && (
              <button
                onClick={() => window.open(exam.pdf_url, '_blank')}
                style={{
                  alignSelf: 'flex-start',
                  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                  color: 'var(--color-accent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  fontFamily: 'Nunito, sans-serif',
                  cursor: 'pointer',
                }}
              >
                📄 Ver PDF
              </button>
            )}

            {exam.notes && (
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Notas
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                  {exam.notes}
                </p>
              </div>
            )}

            {exam.exam_values?.length > 0 && (
              <div>
                <p style={{
                  margin: '0 0 8px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}>
                  Resultados
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.82rem',
                  }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-tertiary)' }}>
                        {['Parámetro', 'Valor', 'Unidad', 'Rango ref.', 'Estado'].map(h => (
                          <th key={h} style={{
                            padding: '7px 10px',
                            textAlign: 'left',
                            fontWeight: 800,
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            whiteSpace: 'nowrap',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {exam.exam_values.map(val => (
                        <tr
                          key={val.id}
                          style={{
                            background: val.is_abnormal
                              ? 'color-mix(in srgb, var(--color-danger) 8%, transparent)'
                              : 'transparent',
                            borderTop: '1px solid var(--border-color)',
                          }}
                        >
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {val.parameter_name}
                          </td>
                          <td style={{ padding: '7px 10px', color: 'var(--text-primary)', fontWeight: 700 }}>
                            {val.value}
                          </td>
                          <td style={{ padding: '7px 10px', color: 'var(--text-muted)' }}>
                            {val.unit || '—'}
                          </td>
                          <td style={{ padding: '7px 10px', color: 'var(--text-muted)' }}>
                            {val.reference_range || '—'}
                          </td>
                          <td style={{ padding: '7px 10px' }}>
                            {val.is_abnormal ? (
                              <span style={{
                                background: 'color-mix(in srgb, var(--color-danger) 18%, transparent)',
                                color: 'var(--color-danger)',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '20px',
                                whiteSpace: 'nowrap',
                              }}>
                                ⚠️ Anormal
                              </span>
                            ) : (
                              <span style={{
                                background: 'color-mix(in srgb, var(--color-success) 18%, transparent)',
                                color: 'var(--color-success)',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '20px',
                                whiteSpace: 'nowrap',
                              }}>
                                ✓ Normal
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
                  color: 'var(--color-danger)',
                  border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  fontFamily: 'Nunito, sans-serif',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                🗑️ {deleting ? 'Eliminando...' : 'Eliminar examen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
