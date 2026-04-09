import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '64px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 100, boxSizing: 'border-box' }}>

      {/* Logo */}
      <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span style={{ fontSize: '1.4rem' }}>🐾</span>
        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'Nunito, sans-serif' }}>PetHealth</span>
      </button>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          {lang === 'es' ? '🇺🇸' : '🇪🇸'}
          {lang === 'es' ? 'EN' : 'ES'}
        </button>

        <ThemeToggle />

        {user && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {user.username}
          </span>
        )}

        <button
          onClick={logout}
          title={t.nav.logout}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <LogOut size={14} />
          {t.nav.logout}
        </button>
      </div>
    </nav>
  )
}
