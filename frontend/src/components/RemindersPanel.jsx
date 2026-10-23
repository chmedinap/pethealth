import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Pill, Stethoscope, Syringe, AlertTriangle, Clock, ChevronRight, ChevronDown } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { formatDate, relativeDate } from '../utils/format'

const ICONS = { visit: Stethoscope, vaccine: Syringe, medication: Pill }
const TAB_FOR = { visit: 'checkups', vaccine: 'vaccines', medication: 'checkups' }
const MAX_ROWS = 4

function ReminderRow({ item, t, lang, onOpen }) {
  const tr = t.reminders
  const Icon = ICONS[item.type]
  const kind = item.type === 'visit' ? tr.visit : item.type === 'vaccine' ? tr.vaccine : null
  return (
    <li>
      <button className={`rem-item${item.status === 'overdue' ? ' is-overdue' : ''}`} onClick={() => onOpen(item)}>
        <span className={`rem-ic ${item.type}`}><Icon size={17} /></span>
        <span className="rem-main">
          <span className="rem-title" style={{ display: 'block' }}>
            {item.pet_name} · {kind ? `${kind}: ${item.title}` : item.title}
          </span>
          <span className="rem-sub">
            {item.type === 'medication'
              ? `${item.frequency} · ${tr.until} ${formatDate(item.date, lang)}`
              : `${formatDate(item.date, lang)} · ${relativeDate(item.date, lang)}`}
          </span>
        </span>
        {item.status === 'overdue' && <span className="status status-overdue"><AlertTriangle size={12} /> {tr.overdue}</span>}
        {item.status === 'upcoming' && <span className="status status-soon"><Clock size={12} /> {tr.upcoming}</span>}
        <ChevronRight size={17} className="rem-chev" />
      </button>
    </li>
  )
}

// Los datos los carga Dashboard (los reutiliza para el estado de cada tarjeta)
export default function RemindersPanel({ data }) {
  const { t, lang } = useLanguage()
  const tr = t.reminders
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  if (!data || (data.due.length === 0 && data.medications.length === 0)) return null

  const open = item => navigate(`/pets/${item.pet_id}?tab=${TAB_FOR[item.type]}`)
  const overdue = data.due.filter(d => d.status === 'overdue').length
  const due = expanded ? data.due : data.due.slice(0, MAX_ROWS)
  const hasMore = data.due.length > MAX_ROWS

  return (
    <section className="reminders" aria-label={tr.title}>
      <div className="rem-col">
        <h2>
          <Bell size={18} /> {tr.title}
          <span className="count">{data.due.length}</span>
          {overdue > 0 && (
            <span className="status status-overdue" style={{ marginLeft: 'auto' }}>
              <AlertTriangle size={12} /> {(overdue === 1 ? tr.overdueCountOne : tr.overdueCount).replace('{n}', overdue)}
            </span>
          )}
        </h2>
        {data.due.length === 0
          ? <p className="rem-empty">{tr.nothingDue}</p>
          : <ul className="rem-list">{due.map(item => <ReminderRow key={`${item.type}-${item.ref_id}`} item={item} t={t} lang={lang} onOpen={open} />)}</ul>}
        {hasMore && (
          <button className="rem-more" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}>
            {expanded ? tr.showLess : tr.showAll.replace('{n}', data.due.length)}
            <ChevronDown size={15} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
        )}
      </div>
      <div className="rem-col">
        <h2><Pill size={18} /> {tr.activeMeds} <span className="count">{data.medications.length}</span></h2>
        {data.medications.length === 0
          ? <p className="rem-empty">{tr.noActiveMeds}</p>
          : <ul className="rem-list">{data.medications.map(item => <ReminderRow key={`m-${item.ref_id}`} item={item} t={t} lang={lang} onOpen={open} />)}</ul>}
      </div>
    </section>
  )
}
