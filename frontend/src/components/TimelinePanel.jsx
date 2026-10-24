import { useState } from 'react'
import { Stethoscope, FlaskConical, Syringe, Bug, Scale, HeartPulse, ChevronRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { formatDate } from '../utils/format'
import { TIMELINE_TYPES, buildTimeline, groupByYear } from '../utils/timeline'

const ICONS = { checkup: Stethoscope, exam: FlaskConical, vaccine: Syringe, parasite: Bug, weight: Scale, condition: HeartPulse }

// Todo el historial en orden cronológico; cada evento lleva a su pestaña
export default function TimelinePanel({ data, onOpen }) {
  const { t, lang } = useLanguage()
  const tt = t.timeline
  const [filter, setFilter] = useState('all')

  const events = buildTimeline(data)
  const present = TIMELINE_TYPES.filter(type => events.some(e => e.type === type))
  const shown = filter === 'all' ? events : events.filter(e => e.type === filter)

  if (events.length === 0) {
    return (
      <div className="panel-card">
        <div className="section-empty">
          <span className="se-emoji">🗓️</span>
          <h3 className="t-h3" style={{ margin: '0 0 6px' }}>{tt.emptyTitle}</h3>
          <p className="t-bodysm" style={{ margin: 0 }}>{tt.emptySub}</p>
        </div>
      </div>
    )
  }

  const title = e => {
    if (e.type === 'weight') return `${e.value.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')} ${t.common.kg}`
    if (e.type === 'parasite') return `${e.title} · ${t.parasites.kinds[e.kind]}`
    if (e.type === 'condition') return `${e.title} · ${e.kind === 'allergy' ? t.conditions.allergy : t.conditions.chronic}`
    return e.title
  }

  return (
    <div className="panel-card">
      {present.length > 1 && (
        <div className="filters" style={{ marginBottom: 12 }}>
          {['all', ...present].map(k => (
            <button key={k} className="chip chip-xs" data-on={filter === k ? '1' : '0'} onClick={() => setFilter(k)}>
              {k === 'all' ? tt.all : tt.types[k]}
            </button>
          ))}
        </div>
      )}

      {groupByYear(shown).map(({ year, events: list }) => (
        <section key={year} className="tline">
          <div className="tl-year">{year}</div>
          <ol>
            {list.map(e => {
              const Icon = ICONS[e.type]
              const body = (
                <>
                  <span className={`rem-ic ${e.type}`}><Icon size={16} /></span>
                  <span className="tline-main">
                    <span className="tline-kind">{tt[e.type]} · {formatDate(e.date, lang)}</span>
                    <span className="tline-title">{title(e)}</span>
                    {(e.sub || e.abnormal > 0) && (
                      <span className="tline-sub">
                        {e.sub}
                        {e.abnormal > 0 && <span className="status status-overdue" style={{ marginLeft: e.sub ? 6 : 0 }}>{tt.abnormal.replace('{n}', e.abnormal)}</span>}
                      </span>
                    )}
                  </span>
                  {e.tab && <ChevronRight size={16} className="rem-chev" />}
                </>
              )
              return (
                <li key={`${e.type}-${e.id}`}>
                  {e.tab
                    ? <button className="tline-item" onClick={() => onOpen(e.tab)}>{body}</button>
                    : <div className="tline-item">{body}</div>}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
