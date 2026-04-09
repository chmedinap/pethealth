import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import Navbar from '../components/Navbar'
import PetCard from '../components/PetCard'
import { useLanguage } from '../context/LanguageContext'
import { getPets } from '../api'

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ height: '180px', background: 'var(--bg-tertiary)' }}>
        <div style={pulse({ width: '100%', height: '100%' })} />
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={pulse({ height: '18px', width: '60%', borderRadius: '8px' })} />
        <div style={pulse({ height: '13px', width: '40%', borderRadius: '8px' })} />
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={pulse({ height: '22px', width: '70px', borderRadius: '20px' })} />
          <div style={pulse({ height: '22px', width: '55px', borderRadius: '20px' })} />
        </div>
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
          <div style={pulse({ height: '13px', width: '55%', borderRadius: '8px' })} />
        </div>
      </div>
    </div>
  )
}

function pulse(extra) {
  return { background: 'var(--bg-tertiary)', animation: 'pulse 1.5s ease-in-out infinite', ...extra }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getPets()
      .then(res => setPets(res.data))
      .catch(() => setError(t.dashboard.loadError))
      .finally(() => setLoading(false))
  }, [])

  const filtered = pets.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      <Navbar />
      <main style={{ paddingTop: '80px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '100px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginTop: '28px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {t.dashboard.title}
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {loading ? t.common.loading : `${pets.length} ${pets.length === 1 ? t.dashboard.countOne : t.dashboard.countMany}`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '8px 14px', minWidth: '220px' }}>
            <Search size={16} color="var(--text-muted)" strokeWidth={2.5} />
            <input
              type="text"
              placeholder={t.dashboard.search}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontFamily: 'Nunito, sans-serif', fontSize: '0.9rem', width: '100%' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-danger)', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {!error && loading ? (
          <div style={gridStyle}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !error && pets.length === 0 ? (
          <EmptyState t={t} onAdd={() => navigate('/pets/new')} />
        ) : !error && filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>{t.dashboard.noResults}</p>
          </div>
        ) : !error ? (
          <div style={gridStyle}>
            {filtered.map(pet => <PetCard key={pet.id} pet={pet} />)}
          </div>
        ) : null}
      </main>

      <FAB onClick={() => navigate('/pets/new')} />
    </>
  )
}

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }

function EmptyState({ t, onAdd }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '16px', textAlign: 'center' }}>
      <span style={{ fontSize: '3.5rem' }}>🐾</span>
      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.dashboard.emptyTitle}</p>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t.dashboard.emptySub}</p>
      <button onClick={onAdd} style={{ marginTop: '8px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}>
        {t.dashboard.emptyBtn}
      </button>
    </div>
  )
}

function FAB({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} aria-label="Add pet"
      style={{ position: 'fixed', bottom: '32px', right: '32px', width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(91,138,110,0.45)', transform: hovered ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.2s ease', zIndex: 50 }}>
      <Plus size={26} strokeWidth={2.5} />
    </button>
  )
}
