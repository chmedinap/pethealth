import { useNavigate } from 'react-router-dom'
import { Stethoscope, Scale, ArrowRight, Users, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { calcAge, relativeDate } from '../utils/format'
import { speciesMeta, speciesLabel } from '../utils/species'

// Estado de salud de la mascota: el recordatorio más urgente (la API ya los ordena por fecha)
function HealthPill({ reminder, t, lang }) {
  if (!reminder) {
    return <span className="status status-ok"><CheckCircle2 size={12} /> <span className="status-txt">{t.petCard.allGood}</span></span>
  }
  const kind = reminder.type === 'visit' ? t.reminders.visit : t.reminders.vaccine
  if (reminder.status === 'overdue') {
    return (
      <span className="status status-overdue" title={`${kind}: ${reminder.title}`}>
        <AlertTriangle size={12} /> <span className="status-txt">{t.reminders.overdue} · {reminder.title}</span>
      </span>
    )
  }
  return (
    <span className="status status-soon" title={`${kind}: ${reminder.title}`}>
      <Clock size={12} /> <span className="status-txt">{reminder.title} · {relativeDate(reminder.date, lang)}</span>
    </span>
  )
}

export default function PetCard({ pet, index = 0, reminder }) {
  const navigate = useNavigate()
  const { t, lang } = useLanguage()

  const meta = speciesMeta(pet.species)
  const shared = pet.access && pet.access !== 'owner'
  const age = calcAge(pet.birth_date, t.common)
  const lastVisit = relativeDate(pet.last_checkup, lang)
  const open = () => navigate(`/pets/${pet.id}`)

  return (
    <article
      className="petcard pc-portrait"
      style={{ animationDelay: `${index * 70}ms` }}
      onClick={open}
      onKeyDown={e => { if (e.key === 'Enter') open() }}
      tabIndex={0}
      role="link"
      aria-label={pet.name}
    >
      <div style={{ position: 'relative' }}>
        {pet.photo_url ? (
          <div className="pc-photo">
            <img src={pet.photo_url} alt={pet.name} />
          </div>
        ) : (
          <div className="photo pc-photo" style={{ '--tint': meta.tint }}>
            <span className="ph-emoji">{meta.emoji}</span>
          </div>
        )}

        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
          <span className={`badge ${meta.badge}`}>
            <span className="emoji">{meta.emoji}</span>
            {speciesLabel(pet.species, t)}
          </span>
        </div>
        {shared && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
            <span className="badge badge-neutral" title={t.share.sharedBy.replace('{owner}', pet.owner_username)}>
              <Users size={12} /> {pet.access === 'editor' ? t.share.roleEditor : t.share.roleViewer}
            </span>
          </div>
        )}
      </div>

      <div className="pc-body">
        <div className="pc-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 className="pc-name t-h3">{pet.name}</h3>
          <span className="pc-age">{age}</span>
        </div>
        <div className="pc-meta">{pet.breed || t.petCard.unknownBreed}</div>

        <div className="pc-stats">
          <div className="pc-stat">
            <div className="k">{t.common.weight}</div>
            <div className="v">
              <Scale size={14} style={{ color: 'var(--text-3)' }} />
              {pet.weight_kg != null ? (
                <>{pet.weight_kg.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')}<span style={{ fontSize: 12, color: 'var(--text-3)' }}> {t.common.kg}</span></>
              ) : '—'}
            </div>
          </div>
          <div className="pc-stat">
            <div className="k">{t.profile.lastCheckup}</div>
            <div className="v" style={{ fontSize: 13 }}>
              <Stethoscope size={13} style={{ color: 'var(--text-3)' }} />
              {lastVisit || '—'}
            </div>
          </div>
        </div>

        <div className="pc-foot">
          <HealthPill reminder={reminder} t={t} lang={lang} />
          <ArrowRight size={18} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        </div>
      </div>
    </article>
  )
}
