import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PawPrint, LogOut, Moon, Sun, ChevronDown, User, Languages } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  const initial = user?.username?.[0]?.toUpperCase() || '?'

  // Cierra el menú de cuenta al hacer clic fuera o con Escape
  useEffect(() => {
    if (!open) return
    const onDown = e => { if (!menuRef.current?.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <nav className="nav">
      <button
        onClick={() => navigate('/')}
        aria-label={t.nav.companions}
        title={t.nav.companions}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}
      >
        <div className="brand">
          <div className="brand-mark">
            <PawPrint size={22} strokeWidth={2.4} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="brand-name">Pet<span>Health</span></div>
            <div className="brand-sub">Tracker</div>
          </div>
        </div>
      </button>

      <div className="nav-spacer" />

      <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
        {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
      </button>

      {user && (
        <div className="acct" ref={menuRef}>
          <button
            className="acct-btn"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            <span className="avatar avatar-sm" aria-hidden="true">{initial}</span>
            <span className="acct-name">{user.username}</span>
            <ChevronDown size={16} className="acct-chev" />
          </button>

          {open && (
            <div className="acct-menu" role="menu">
              <button role="menuitem" className="acct-item" onClick={() => { setOpen(false); navigate('/account') }}>
                <User size={17} /> {t.nav.account}
              </button>
              <div className="acct-item acct-static">
                <Languages size={17} />
                <span style={{ flex: 1 }}>{t.login.language}</span>
                <span className="seg">
                  <button data-on={lang === 'es' ? '1' : '0'} onClick={() => setLang('es')}>ES</button>
                  <button data-on={lang === 'en' ? '1' : '0'} onClick={() => setLang('en')}>EN</button>
                </span>
              </div>
              <div className="acct-sep" />
              <button role="menuitem" className="acct-item is-danger" onClick={logout}>
                <LogOut size={17} /> {t.nav.logout}
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
