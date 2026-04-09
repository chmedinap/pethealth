import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label="Cambiar tema"
      style={{
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        border: 'none',
        background: 'var(--bg-tertiary)',
        cursor: 'pointer',
        fontSize: '1.1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
