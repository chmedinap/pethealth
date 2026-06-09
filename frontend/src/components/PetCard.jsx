import { useNavigate } from 'react-router-dom'
import { Stethoscope, Scale, ArrowRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

function calcAge(birthDate, tc) {
  if (!birthDate) return tc.unknownAge
  const birth = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0) { years--; months += 12 }
  if (years < 0 || (years === 0 && months < 0)) return tc.unknownAge
  if (years === 0) return `${months} ${months === 1 ? tc.month : tc.months}`
  if (months === 0) return `${years} ${years === 1 ? tc.year : tc.years}`
  return `${years} ${years === 1 ? tc.year : tc.years} ${tc.and} ${months} ${months === 1 ? tc.month : tc.months}`
}

function formatDateRelative(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes.`
  return `Hace ${Math.floor(diffDays / 365)} año(s)`
}

export default function PetCard({ pet, index = 0 }) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const speciesEmoji = pet.species === 'cat' ? '🐱' : '🐶'
  const speciesCls = pet.species === 'cat' ? 'badge-cat' : 'badge-dog'
  const age = calcAge(pet.birth_date, t.common)
  const lastVisit = formatDateRelative(pet.last_checkup)

  return (
    <article
      className="petcard pc-portrait"
      style={{ animationDelay: `${index * 70}ms` }}
      onClick={() => navigate(`/pets/${pet.id}`)}
    >
      {/* Photo */}
      <div style={{ position: 'relative' }}>
        {pet.photo_url ? (
          <div style={{ height: 170, overflow: 'hidden', borderRadius: 0, position: 'relative' }}>
            <img
              src={pet.photo_url}
              alt={pet.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        ) : (
          <div
            className="photo"
            style={{ height: 170, borderRadius: 0, '--tint': pet.species === 'cat' ? 'var(--accent)' : 'var(--secondary)' }}
          >
            <span className="ph-emoji">{speciesEmoji}</span>
          </div>
        )}

        {/* Species badge top-left */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
          <span className={`badge ${speciesCls}`}>
            <span className="emoji">{speciesEmoji}</span>
            {pet.species === 'cat' ? t.common.cat : t.common.dog}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="pc-body">
        <div className="pc-row" style={{ justifyContent: 'space-between' }}>
          <h3 className="pc-name t-h3">{pet.name}</h3>
          <span className="badge badge-neutral">{age}</span>
        </div>

        <div className="pc-meta">
          {pet.breed || t.petCard.unknownBreed}
          {pet.weight_kg != null && (
            <span style={{ marginLeft: 6, color: 'var(--text-3)' }}>· {pet.weight_kg} {t.common.kg}</span>
          )}
        </div>

        <div className="pc-stats">
          <div className="pc-stat">
            <div className="k">{t.common.weight || 'Peso'}</div>
            <div className="v">
              <Scale size={14} style={{ color: 'var(--text-3)' }} />
              {pet.weight_kg != null ? (
                <>{pet.weight_kg}<span style={{ fontSize: 12, color: 'var(--text-3)' }}> {t.common.kg}</span></>
              ) : '—'}
            </div>
          </div>
          <div className="pc-stat">
            <div className="k">{t.profile?.lastCheckup || 'Última visita'}</div>
            <div className="v" style={{ fontSize: 13 }}>
              <Stethoscope size={13} style={{ color: 'var(--text-3)' }} />
              {lastVisit || '—'}
            </div>
          </div>
        </div>

        <div className="pc-foot">
          <span className="pc-next">
            <Stethoscope size={14} />
            {pet.last_checkup ? lastVisit : <em style={{ fontStyle: 'italic' }}>{t.petCard.noVisits}</em>}
          </span>
          <ArrowRight size={18} style={{ color: 'var(--text-3)' }} />
        </div>
      </div>
    </article>
  )
}
