import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Pill, Stethoscope, Syringe, AlertTriangle, Clock } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getReminders } from '../api'
import { formatDate, relativeDate, todayISO } from '../utils/format'

const ICONS = { visit: Stethoscope, vaccine: Syringe, medication: Pill }
const TAB_FOR = { visit: 'checkups', vaccine: 'vaccines', medication: 'checkups' }

function ReminderRow({ item, t, lang, onOpen }) {
  const tr = t.reminders
  const Icon = ICONS[item.type]
  const kind = item.type === 'visit' ? tr.visit : item.type === 'vaccine' ? tr.vaccine : null
  return (
    <li>
      <button className="rem-item" onClick={() => onOpen(item)}>
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
      </button>
    </li>
  )
}

export default function RemindersPanel() {
  const { t, lang } = useLanguage()
  const tr = t.reminders
  const navigate = useNavigate()
  const [data, setData] = useState(null)

  useEffect(() => {
    getReminders(todayISO(), 30).then(res => setData(res.data)).catch(() => {})
  }, [])

  if (!data || (data.due.length === 0 && data.medications.length === 0)) return null

  const open = item => navigate(`/pets/${item.pet_id}?tab=${TAB_FOR[item.type]}`)
  const overdue = data.due.filter(d => d.status === 'overdue').length

  return (
    <section className="reminders" aria-label={tr.title}>
      <div className="card">
        <h2>
          <Bell size={18} /> {tr.title}
          <span className="count">{data.due.length}</span>
          {overdue > 0 && <span className="status status-overdue" style={{ marginLeft: 'auto' }}><AlertTriangle size={12} /> {tr.overdueCount.replace('{n}', overdue)}</span>}
        </h2>
        {data.due.length === 0
          ? <p className="rem-empty">{tr.nothingDue}</p>
          : <ul className="rem-list">{data.due.map(item => <ReminderRow key={`${item.type}-${item.ref_id}`} item={item} t={t} lang={lang} onOpen={open} />)}</ul>}
      </div>
      <div className="card">
        <h2><Pill size={18} /> {tr.activeMeds} <span className="count">{data.medications.length}</span></h2>
        {data.medications.length === 0
          ? <p className="rem-empty">{tr.noActiveMeds}</p>
          : <ul className="rem-list">{data.medications.map(item => <ReminderRow key={`m-${item.ref_id}`} item={item} t={t} lang={lang} onOpen={open} />)}</ul>}
      </div>
    </section>
  )
}
