import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, Check, User, ShieldAlert, LogOut, Mail, CalendarDays, Wallet, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getMe, changePassword, revokeOtherSessions, updateMe, createCalendarToken, deleteCalendarToken, sendTestEmail } from '../api'
import { copyText, formatDate, todayISO } from '../utils/format'
import { useFeedback } from '../context/FeedbackContext'

const MIN_PASSWORD = 8
const CURRENCIES = ['USD', 'EUR', 'COP', 'MXN', 'ARS', 'CLP', 'PEN', 'BRL', 'UYU', 'GBP', 'CAD']

function SectionHead({ icon: Icon, title, sub }) {
  return (
    <div className="fsection-head">
      <div className="fsection-num"><Icon size={16} /></div>
      <div>
        <h3 className="t-h3">{title}</h3>
        {sub && <p>{sub}</p>}
      </div>
    </div>
  )
}

// Preferencias, recordatorios por correo y calendario: secciones que guardan por separado
function CareSettings({ me, setMe, t, lang }) {
  const ta = t.account
  const { askConfirm, toast } = useFeedback()
  const { updateUser } = useAuth()
  const [currency, setCurrency] = useState(me.currency)
  const [email, setEmail] = useState(me.email || '')
  const [notify, setNotify] = useState(me.notifyEmail)
  const [notifyMsg, setNotifyMsg] = useState('')
  const [busy, setBusy] = useState('')

  async function run(key, fn) {
    setBusy(key)
    try { await fn() } catch (err) { toast(err.response?.data?.error || t.common.error500) } finally { setBusy('') }
  }

  const saveCurrency = () => run('currency', async () => {
    const res = await updateMe({ currency })
    setMe(res.data)
    updateUser({ currency: res.data.currency })
    toast(ta.prefsSaved, 'success')
  })

  const saveNotify = e => {
    e.preventDefault()
    setNotifyMsg('')
    if (notify && !email.trim()) { setNotifyMsg(ta.emailRequired); return }
    return run('notify', async () => {
      const res = await updateMe({ email, notify_email: notify, lang })
      setMe(res.data)
      toast(ta.prefsSaved, 'success')
    })
  }

  const testEmail = () => run('test', async () => {
    await sendTestEmail(todayISO())
    toast(ta.testEmailSent, 'success')
  })

  const calendarUrl = me.calendarToken ? `${window.location.origin}/api/calendar/${me.calendarToken}.ics` : null
  const enableCalendar = () => run('calendar', async () => {
    // El feed usa el idioma de la cuenta
    await updateMe({ lang })
    setMe((await createCalendarToken()).data)
  })
  const regenerate = async () => {
    if (!await askConfirm(ta.calendarRegenerateConfirm)) return
    run('calendar', async () => setMe((await createCalendarToken()).data))
  }
  const disable = async () => {
    if (!await askConfirm(ta.calendarDisableConfirm)) return
    run('calendar', async () => setMe((await deleteCalendarToken()).data))
  }
  const copy = () => run('copy', async () => { await copyText(calendarUrl); toast(ta.calendarCopied, 'success') })

  return (
    <>
      <div className="fsection">
        <SectionHead icon={Wallet} title={ta.prefsTitle} sub={ta.prefsSub} />
        <div className="inline-row">
          <div className="field" style={{ minWidth: 160 }}>
            <label>{ta.currency}</label>
            <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
              {[...new Set([me.currency, ...CURRENCIES])].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveCurrency} disabled={busy === 'currency' || currency === me.currency}>
            <Check size={15} /> {ta.saveBtn}
          </button>
        </div>
      </div>

      <form className="fsection" onSubmit={saveNotify}>
        <SectionHead icon={Mail} title={ta.notifyTitle} sub={ta.notifySub} />
        {!me.emailEnabled && <p className="notice notice-warning" style={{ margin: '0 0 12px' }}>{ta.notifyDisabled}</p>}
        <div className="field">
          <label>{ta.email}</label>
          <input className="input" type="email" autoComplete="email" placeholder={ta.emailPlaceholder} value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <label className="check-row">
          <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} disabled={!me.emailEnabled} />
          {ta.notifyToggle}
        </label>
        {notifyMsg && <p className="form-error">⚠️ {notifyMsg}</p>}
        <div className="inline-row" style={{ justifyContent: 'flex-end' }}>
          {me.emailEnabled && me.email && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={testEmail} disabled={busy === 'test'}>{ta.testEmail}</button>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy === 'notify'}><Check size={15} /> {ta.saveBtn}</button>
        </div>
      </form>

      <div className="fsection">
        <SectionHead icon={CalendarDays} title={ta.calendarTitle} sub={ta.calendarSub} />
        {calendarUrl ? (
          <>
            <div className="copy-field">
              <input className="input" readOnly value={calendarUrl} onFocus={e => e.target.select()} aria-label={ta.calendarTitle} />
              <button className="btn btn-primary btn-sm" onClick={copy}><Copy size={15} /> {ta.calendarCopy}</button>
            </div>
            <p className="hint" style={{ margin: '8px 0 0' }}>{ta.calendarGoogle}</p>
            <p className="hint" style={{ margin: '4px 0 12px' }}>🔒 {ta.calendarPrivate}</p>
            <div className="inline-row">
              <a className="btn btn-ghost btn-sm" href={calendarUrl.replace(/^https?:/, 'webcal:')}><ExternalLink size={15} /> {ta.calendarOpen}</a>
              <button className="btn btn-ghost btn-sm" onClick={regenerate} disabled={busy === 'calendar'}><RefreshCw size={15} /> {ta.calendarRegenerate}</button>
              <button className="link-danger" onClick={disable} disabled={busy === 'calendar'}>{ta.calendarDisable}</button>
            </div>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={enableCalendar} disabled={busy === 'calendar'}><CalendarDays size={15} /> {ta.calendarEnable}</button>
        )}
      </div>
    </>
  )
}

export default function Account() {
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const { askConfirm } = useFeedback()
  const [me, setMe] = useState(null)
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [revokeMsg, setRevokeMsg] = useState('')
  const { user, login } = useAuth()
  const mustChange = !!user?.mustChangePassword

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
      // El backend revoca las demás sesiones y devuelve un token nuevo para esta
      const res = await changePassword({ current_password: form.current, new_password: form.next })
      login(res.data)
      setForm({ current: '', next: '', confirm: '' })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || t.common.error500)
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke() {
    if (!await askConfirm(t.account.revokeConfirm)) return
    try {
      const res = await revokeOtherSessions()
      login(res.data)
      setRevokeMsg(t.account.revokeDone)
    } catch (err) {
      setRevokeMsg(err.response?.data?.error || t.common.error500)
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 60, maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
        <div className="screen form-wrap">
          {!mustChange && (
            <button className="back-btn" onClick={() => navigate('/')}>
              <ArrowLeft size={18} strokeWidth={2.4} />
              {t.dashboard.title}
            </button>
          )}

          {mustChange && (
            <div className="notice notice-warning" role="alert">
              <ShieldAlert size={20} />
              <div>
                <strong>{t.account.mustChangeTitle}</strong>
                <p>{t.account.mustChangeBody}</p>
              </div>
            </div>
          )}

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
            {success && (
              <p style={{ color: 'var(--success-ink)', fontWeight: 700, fontSize: 14, margin: '14px 0 0' }}>
                ✓ {t.account.success}{' '}
                <button type="button" className="link-btn" onClick={() => navigate('/')}>{t.account.goToPets}</button>
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
                <Check size={16} strokeWidth={2.8} />
                {saving ? t.common.saving : t.account.submit}
              </button>
            </div>
          </form>

          {!mustChange && me && <CareSettings me={me} setMe={setMe} t={t} lang={lang} />}

          {!mustChange && (
            <div className="fsection">
              <div className="fsection-head">
                <div className="fsection-num"><LogOut size={16} /></div>
                <div>
                  <h3 className="t-h3">{t.account.sessionsTitle}</h3>
                  <p>{t.account.sessionsSub}</p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleRevoke}>{t.account.revokeBtn}</button>
              {revokeMsg && <p style={{ color: 'var(--text-2)', fontWeight: 700, fontSize: 14, margin: '12px 0 0' }}>{revokeMsg}</p>}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
