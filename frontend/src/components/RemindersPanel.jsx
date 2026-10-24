import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Pill, Stethoscope, Syringe, Bug, AlertTriangle, Clock, ChevronRight, ChevronDown, Plus, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useFeedback } from '../context/FeedbackContext'
import { createDose } from '../api'
import { formatDate, nowTime, relativeDate } from '../utils/format'
import { dosesPerDay } from '../utils/medications'

const ICONS = { visit: Stethoscope, vaccine: Syringe, parasite: Bug, medication: Pill }
const TAB_FOR = { visit: 'checkups', vaccine: 'vaccines', parasite: 'parasites', medication: 'checkups' }
const MAX_ROWS = 4

// Botón de dosis del día: «1/2 hoy». Solo lectura ve el progreso pero no lo cambia.
function DoseButton({ item, today, t, onDose }) {
  const tr = t.reminders
  const { toast, askConfirm } = useFeedback()
  const [busy, setBusy] = useState(false)
  const given = item.doses_today?.length || 0
  const target = dosesPerDay(item.frequency)
  const done = target != null && given >= target
  const label = target != null ? tr.dosesToday.replace('{n}', given).replace('{total}', target) : tr.dosesTodayOpen.replace('{n}', given)
  const times = (item.doses_today || []).map(d => d.given_time + (d.given_by_username ? ` (${d.given_by_username})` : '')).join(', ')

  if (item.access === 'viewer') return <span className={`dose-pill${done ? ' is-done' : ''}`} title={times || undefined}>{label}</span>

  async function give() {
    // Con las dosis del día completas, una más suele ser un toque por error
    if (done && !await askConfirm(tr.extraDoseConfirm.replace('{name}', item.title), { danger: false, confirmLabel: tr.giveDose })) return
    setBusy(true)
    try {
      const res = await createDose(item.ref_id, { given_on: today, given_time: nowTime() })
      onDose(item.ref_id, res.data)
      toast(tr.doseGiven.replace('{name}', `${item.pet_name} · ${item.title}`), 'success')
    } catch (err) {
      toast(err.response?.data?.error || tr.doseError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className={`dose-btn${done ? ' is-done' : ''}`} onClick={give} disabled={busy}
      title={[done ? tr.dosesDone : tr.giveDose, times].filter(Boolean).join(' · ')}
      aria-label={`${tr.giveDose}: ${item.pet_name} · ${item.title} (${label})`}>
      {done ? <CheckCircle2 size={14} /> : <Plus size={14} />} {label}
    </button>
  )
}

function ReminderRow({ item, t, lang, onOpen, extra }) {
  const tr = t.reminders
  const Icon = ICONS[item.type]
  const kind = { visit: tr.visit, vaccine: tr.vaccine, parasite: tr.parasite }[item.type] || null
  return (
    <li className={extra ? 'rem-row' : undefined}>
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
      {extra}
    </li>
  )
}

// Los datos los carga Dashboard (los reutiliza para el estado de cada tarjeta)
export default function RemindersPanel({ data, onDose }) {
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
          : <ul className="rem-list">{data.medications.map(item => (
              <ReminderRow key={`m-${item.ref_id}`} item={item} t={t} lang={lang} onOpen={open}
                extra={<DoseButton item={item} today={data.today} t={t} onDose={onDose} />} />
            ))}</ul>}
      </div>
    </section>
  )
}
