import { useNavigate, useLocation } from 'react-router-dom'
import { PawPrint, LogOut, Moon, Sun, LayoutGrid } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const isDashboard = location.pathname === '/'
  const initial = user?.username?.[0]?.toUpperCase() || '?'

  return (
    <nav className="nav">
      {/* Brand */}
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <div className="brand">
          <div className="brand-mark">
            <PawPrint size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div className="brand-name">Pet<span>Health</span></div>
            <div className="brand-sub">Tracker</div>
          </div>
        </div>
      </button>

      {/* Nav links */}
      <div className="nav-links">
        <button
          className="nav-link"
          data-on={isDashboard ? '1' : '0'}
          onClick={() => navigate('/')}
        >
          <LayoutGrid size={17} />
          {t.nav.companions}
        </button>
      </div>

      <div className="nav-spacer" />

      {/* Language toggle */}
      <div className="lang-toggle">
        <button data-on={lang === 'es' ? '1' : '0'} onClick={() => setLang('es')}>ES</button>
        <button data-on={lang === 'en' ? '1' : '0'} onClick={() => setLang('en')}>EN</button>
      </div>

      {/* Theme toggle */}
      <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
        {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
      </button>

      {/* Avatar */}
      {user && (
        <button
          className="avatar"
          onClick={() => navigate('/account')}
          title={`${t.nav.account} · ${user.username}`}
          aria-label={t.nav.account}
        >
          {initial}
        </button>
      )}

      {/* Logout */}
      {user && (
        <button
          className="icon-btn"
          onClick={logout}
          title={t.nav.logout}
          aria-label="Logout"
        >
          <LogOut size={18} />
        </button>
      )}
    </nav>
  )
}
