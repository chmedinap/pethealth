import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { loginUser } from '../api'

export default function Login() {
  const { isAuthenticated, login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleLogin() {
    if (!username || !password) { setError(t.login.fillAll); return }
    setError('')
    setLoading(true)
    try {
      const { data } = await loginUser({ username, password })
      login({ token: data.token, user: data.user })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || t.common.error500)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fadeUp 0.4s ease-out both; }
        .login-input {
          width: 100%; border: 1px solid var(--border-color);
          background: var(--bg-tertiary); color: var(--text-primary);
          border-radius: 10px; padding: 10px 14px;
          font-family: 'Nunito', sans-serif; font-size: 0.95rem;
          outline: none; box-sizing: border-box;
        }
        .login-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
        }
        .login-input::placeholder { color: var(--text-muted); }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{ position: 'fixed', top: '1rem', right: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-card)' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Card */}
        <div className="login-card" style={{ background: 'var(--bg-secondary)', borderRadius: '24px', boxShadow: 'var(--shadow-card)', padding: '2.5rem 2rem', width: '100%', maxWidth: '420px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '0.75rem' }}>🐾</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 0.25rem' }}>
              {t.login.title}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              {t.login.subtitle}
            </p>
          </div>

          {/* Language selector */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
            {[
              { code: 'es', flag: '🇪🇸', label: 'Español' },
              { code: 'en', flag: '🇺🇸', label: 'English' },
            ].map(({ code, flag, label }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem',
                  border: lang === code
                    ? '2px solid var(--color-primary)'
                    : '2px solid var(--border-color)',
                  background: lang === code
                    ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                    : 'var(--bg-tertiary)',
                  color: lang === code ? 'var(--color-primary)' : 'var(--text-muted)',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{flag}</span>
                {label}
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', marginBottom: '1.75rem' }} />

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                {t.login.username}
              </label>
              <input className="login-input" type="text" placeholder={t.login.usernamePlaceholder} value={username} onChange={e => setUsername(e.target.value)} onKeyDown={handleKeyDown} autoComplete="username" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                {t.login.password}
              </label>
              <input className="login-input" type="password" placeholder={t.login.passwordPlaceholder} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} autoComplete="current-password" />
            </div>
          </div>

          {error && (
            <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--color-danger)', fontSize: '0.875rem', fontWeight: 600 }}>
              ⚠️ {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ marginTop: '1.75rem', width: '100%', background: loading ? 'var(--text-muted)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '1rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.02em' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--color-primary-hover)' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--color-primary)' }}
          >
            {loading ? t.login.submitting : t.login.submit}
          </button>
        </div>
      </div>
    </>
  )
}
