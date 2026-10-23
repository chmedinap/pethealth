import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, Check, User } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useLanguage } from '../context/LanguageContext'
import { getMe, changePassword } from '../api'
import { formatDate } from '../utils/format'

const MIN_PASSWORD = 8

export default function Account() {
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const [me, setMe] = useState(null)
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getMe().then(res => setMe(res.data)).catch(() => {})
  }, [])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setError('')
    setSuccess(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.current || !form.next) { setError(t.login.fillAll); return }
    if (form.next.length < MIN_PASSWORD) { setError(t.account.tooShort); return }
    if (form.next !== form.confirm) { setError(t.account.mismatch); return }
    setSaving(true)
    try {
      await changePassword({ current_password: form.current, new_password: form.next })
      setForm({ current: '', next: '', confirm: '' })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || t.common.error500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 60, maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
        <div className="screen form-wrap">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} strokeWidth={2.4} />
            {t.dashboard.title}
          </button>

          <div className="form-hero">
            <div className="fh-ic"><User size={26} /></div>
            <div style={{ flex: 1 }}>
              <h1 className="t-h2" style={{ margin: '0 0 3px' }}>{t.account.title}</h1>
              {me && (
                <p>
                  {t.account.username}: <strong>{me.username}</strong>
                  {me.created_at && <> · {t.account.memberSince} {formatDate(me.created_at, lang)}</>}
                </p>
              )}
            </div>
          </div>

          <form className="fsection" onSubmit={handleSubmit}>
            <div className="fsection-head">
              <div className="fsection-num"><KeyRound size={16} /></div>
              <h3 className="t-h3">{t.account.changePassword}</h3>
            </div>
            <div className="fgrid">
              <div className="field col-2">
                <label>{t.account.currentPassword}</label>
                <input className="input" type="password" autoComplete="current-password" value={form.current} onChange={e => set('current', e.target.value)} />
              </div>
              <div className="field">
                <label>{t.account.newPassword}</label>
                <input className="input" type="password" autoComplete="new-password" value={form.next} onChange={e => set('next', e.target.value)} />
                <span className="hint">{t.login.passwordHint}</span>
              </div>
              <div className="field">
                <label>{t.account.confirmPassword}</label>
                <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={e => set('confirm', e.target.value)} />
              </div>
            </div>

            {error && <p style={{ color: 'var(--danger-ink)', fontWeight: 700, fontSize: 14, margin: '14px 0 0' }}>⚠️ {error}</p>}
            {success && <p style={{ color: 'var(--success-ink)', fontWeight: 700, fontSize: 14, margin: '14px 0 0' }}>✓ {t.account.success}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
                <Check size={16} strokeWidth={2.8} />
                {saving ? t.common.saving : t.account.submit}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}
