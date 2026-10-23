import { useEffect, useState } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getPetShares, sharePet, removePetShare } from '../api'
import Modal from './Modal'
import { useFeedback } from '../context/FeedbackContext'

export default function ShareAccessDialog({ pet, onClose }) {
  const { t } = useLanguage()
  const { askConfirm } = useFeedback()
  const ts = t.share
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('viewer')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPetShares(pet.id).then(res => setShares(res.data)).finally(() => setLoading(false))
  }, [pet.id])

  async function handleAdd(e) {
    e.preventDefault()
    if (!username.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await sharePet(pet.id, { username: username.trim(), role })
      setShares(res.data)
      setUsername('')
    } catch (err) {
      setError(err.response?.data?.error || t.common.error500)
    } finally {
      setSaving(false)
    }
  }

  async function changeRole(share, newRole) {
    try {
      const res = await sharePet(pet.id, { username: share.username, role: newRole })
      setShares(res.data)
    } catch (err) {
      setError(err.response?.data?.error || t.common.error500)
    }
  }

  async function handleRemove(share) {
    if (!await askConfirm(ts.removeConfirm.replace('{user}', share.username))) return
    try {
      const res = await removePetShare(pet.id, share.user_id)
      setShares(res.data)
    } catch (err) {
      setError(err.response?.data?.error || t.common.error500)
    }
  }

  return (
    <Modal title={ts.title.replace('{name}', pet.name)} subtitle={ts.subtitle} onClose={onClose} closeLabel={t.common.close}>
      <form className="inline-form" onSubmit={handleAdd}>
        <div className="fgrid" style={{ gridTemplateColumns: '1fr 160px' }}>
          <div className="field">
            <label htmlFor="share-user">{ts.username}</label>
            <input id="share-user" className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder={ts.usernamePlaceholder} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="share-role">{ts.role}</label>
            <select id="share-role" className="select input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="viewer">{ts.roleViewer}</option>
              <option value="editor">{ts.roleEditor}</option>
            </select>
          </div>
        </div>
        <p className="hint" style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600, margin: '8px 0 0' }}>
          {role === 'viewer' ? ts.viewerHint : ts.editorHint}
        </p>
        {error && <p className="form-error">⚠️ {error}</p>}
        <div className="actions">
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving || !username.trim()}>
            <UserPlus size={15} /> {ts.add}
          </button>
        </div>
      </form>

      <h3 className="t-label muted-3" style={{ margin: '4px 0 6px' }}>{ts.peopleWithAccess}</h3>
      {loading ? (
        <p className="rem-empty">{t.common.loading}</p>
      ) : shares.length === 0 ? (
        <p className="rem-empty">{ts.empty}</p>
      ) : (
        <ul className="row-list">
          {shares.map(s => (
            <li className="row-item" key={s.user_id}>
              <div className="avatar" style={{ width: 34, height: 34, fontSize: 13, cursor: 'default' }} aria-hidden="true">
                {s.username[0].toUpperCase()}
              </div>
              <div className="grow"><div className="name">{s.username}</div></div>
              <select className="select input" style={{ width: 'auto', padding: '6px 10px' }} value={s.role} onChange={e => changeRole(s, e.target.value)} aria-label={ts.role}>
                <option value="viewer">{ts.roleViewer}</option>
                <option value="editor">{ts.roleEditor}</option>
              </select>
              <button className="icon-sm danger" onClick={() => handleRemove(s)} aria-label={ts.remove} title={ts.remove}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
