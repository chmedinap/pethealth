import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'

function calcAge(birthDate) {
  if (!birthDate) return 'Edad desconocida'
  const birth = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0) { years--; months += 12 }
  if (years < 0 || (years === 0 && months < 0)) return 'Edad desconocida'
  if (years === 0) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  if (months === 0) return `${years} ${years === 1 ? 'año' : 'años'}`
  return `${years} ${years === 1 ? 'año' : 'años'} y ${months} ${months === 1 ? 'mes' : 'meses'}`
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PetCard({ pet }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  const speciesLabel = pet.species === 'cat' ? 'Gato' : 'Perro'
  const speciesEmoji = pet.species === 'cat' ? '🐱' : '🐶'
  const genderIcon = pet.gender === 'male' ? '♂️' : pet.gender === 'female' ? '♀️' : null

  return (
    <div
      onClick={() => navigate(`/pets/${pet.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        boxShadow: hovered
          ? '0 8px 28px rgba(0,0,0,0.14)'
          : 'var(--shadow-card)',
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {/* Photo area */}
      <div style={{
        height: '180px',
        background: 'var(--bg-tertiary)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {pet.photo_url ? (
          <img
            src={pet.photo_url}
            alt={pet.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 12%, transparent), color-mix(in srgb, var(--color-primary) 6%, transparent))',
          }}>
            <span style={{ fontSize: '4rem' }}>{speciesEmoji}</span>
          </div>
        )}

        {/* Species badge */}
        <span style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'color-mix(in srgb, var(--color-primary) 82%, transparent)',
          color: '#fff',
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: '20px',
          backdropFilter: 'blur(4px)',
        }}>
          {speciesLabel}
        </span>
      </div>

      {/* Info area */}
      <div style={{ padding: '16px' }}>
        <p style={{
          margin: '0 0 2px',
          fontWeight: 800,
          fontSize: '1.1rem',
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {pet.name}
        </p>

        <p style={{
          margin: '0 0 10px',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          fontStyle: pet.breed ? 'normal' : 'italic',
        }}>
          {pet.breed || 'Raza no especificada'}
        </p>

        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          <Chip>🎂 {calcAge(pet.birth_date)}</Chip>
          {pet.weight_kg != null && <Chip>⚖️ {pet.weight_kg} kg</Chip>}
          {genderIcon && <Chip>{genderIcon} {pet.gender === 'male' ? 'Macho' : 'Hembra'}</Chip>}
        </div>

        {/* Last checkup */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <Stethoscope size={13} color="var(--text-muted)" strokeWidth={2.5} />
          {pet.last_checkup ? (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Último checkup: {formatDate(pet.last_checkup)}
            </span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Sin visitas registradas
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ children }) {
  return (
    <span style={{
      background: 'var(--bg-tertiary)',
      borderRadius: '20px',
      padding: '2px 10px',
      fontSize: '0.78rem',
      color: 'var(--text-secondary)',
      fontWeight: 600,
    }}>
      {children}
    </span>
  )
}
