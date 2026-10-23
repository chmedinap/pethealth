import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import PetCard from '../components/PetCard'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getPets } from '../api'

function SkeletonCard() {
  return (
    <div className="petcard pc-portrait" style={{ pointerEvents: 'none' }}>
      <div style={{ height: 170, background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div className="pc-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 18, width: '60%', borderRadius: 8, background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 13, width: '40%', borderRadius: 8, background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ height: 52, flex: 1, borderRadius: 12, background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 52, flex: 1, borderRadius: 12, background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ height: 13, width: '55%', borderRadius: 8, background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

function greeting(td) {
  const h = new Date().getHours()
  if (h < 12) return td.greetingMorning
  if (h < 18) return td.greetingAfternoon
  return td.greetingEvening
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getPets()
      .then(res => setPets(res.data))
      .catch(() => setError(t.dashboard.loadError))
      .finally(() => setLoading(false))
  }, [])

  const counts = {
    all: pets.length,
    dog: pets.filter(p => p.species === 'dog').length,
    cat: pets.filter(p => p.species === 'cat').length,
  }

  const filtered = pets.filter(p => {
    const okFilter = filter === 'all' || p.species === filter
    const okSearch = !search || (p.name + (p.breed || '')).toLowerCase().includes(search.toLowerCase())
    return okFilter && okSearch
  })

  const chips = [
    { k: 'all', label: t.dashboard.filterAll, emoji: '🐾' },
    { k: 'dog', label: t.dashboard.filterDogs, emoji: '🐶' },
    { k: 'cat', label: t.dashboard.filterCats, emoji: '🐱' },
  ]

  return (
    <>
      <Navbar />
      <main style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 100, maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Greeting header */}
        <div className="dash-head">
          <div className="dash-greet">
            <h1 className="t-h1">
              {greeting(t.dashboard)}, {user?.username} 🌿
            </h1>
            <p className="muted t-body dash-sub">
              {loading ? t.common.loading : (
                counts.all === 0
                  ? t.dashboard.emptySub
                  : (counts.all === 1 ? t.dashboard.underCareOne : t.dashboard.underCareMany).replace('{n}', counts.all)
              )}
            </p>
          </div>

          <div className="dash-tools">
            <div className="searchbox">
              <Search size={18} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.dashboard.search}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0 }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/pets/new')}>
              <Plus size={18} strokeWidth={2.6} />
              {t.dashboard.addBtn}
            </button>
          </div>
        </div>

        {/* Filter chips */}
        {!loading && !error && pets.length > 0 && (
          <div className="filters">
            {chips.map(c => (
              <button key={c.k} className="chip" data-on={filter === c.k ? '1' : '0'} onClick={() => setFilter(c.k)}>
                <span>{c.emoji}</span>
                {c.label}
                <span className="count">{counts[c.k]}</span>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--danger)', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {!error && loading ? (
          <div className="cards cards--portrait">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !error && pets.length === 0 ? (
          <EmptyState t={t} onAdd={() => navigate('/pets/new')} />
        ) : !error && filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-art">🔍</div>
            <h2 className="t-h2">{t.dashboard.noResults}</h2>
            <p className="t-body">{t.dashboard.noResultsSub}</p>
          </div>
        ) : !error ? (
          <div className="cards cards--portrait">
            {filtered.map((pet, i) => <PetCard key={pet.id} pet={pet} index={i} />)}
          </div>
        ) : null}
      </main>

      <button className="fab" onClick={() => navigate('/pets/new')} title={t.dashboard.addBtn} aria-label={t.dashboard.addBtn}>
        <Plus size={26} strokeWidth={2.6} />
      </button>
    </>
  )
}

function EmptyState({ t, onAdd }) {
  return (
    <div className="empty">
      <div className="empty-art">🐾</div>
      <h2 className="t-h2">{t.dashboard.emptyTitle}</h2>
      <p className="t-body">{t.dashboard.emptySub}</p>
      <button className="btn btn-primary btn-lg" onClick={onAdd}>
        <Plus size={19} strokeWidth={2.6} />
        {t.dashboard.emptyBtn}
      </button>
    </div>
  )
}
