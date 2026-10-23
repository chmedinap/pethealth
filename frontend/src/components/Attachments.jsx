import { useRef, useState } from 'react'
import { Paperclip, X } from 'lucide-react'
import { deleteAttachment } from '../api'
import { useFeedback } from '../context/FeedbackContext'

const MAX_ATTACHMENTS = 3

// `labels` es t.checkup o t.exam: ambos tienen las mismas claves de adjuntos.
export default function Attachments({ attachments, setAttachments, upload, labels, canEdit = true }) {
  const fileInputRef = useRef(null)
  const { askConfirm, toast } = useFeedback()
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (attachments.length >= MAX_ATTACHMENTS) { toast(labels.maxFiles); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await upload(fd)
      setAttachments(prev => [...prev, res.data])
    } catch (err) {
      toast(err.response?.data?.error || labels.uploadError)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(attId) {
    if (!await askConfirm(labels.deleteFileConfirm)) return
    try {
      await deleteAttachment(attId)
      setAttachments(prev => prev.filter(a => a.id !== attId))
    } catch {
      toast(labels.deleteFileError)
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="t-label muted-3">{labels.attachments}</span>
        {canEdit && attachments.length < MAX_ATTACHMENTS && (
          <>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" style={{ display: 'none' }} onChange={handleUpload} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn btn-ghost btn-sm">
              <Paperclip size={14} />
              {uploading ? labels.uploading : `+ ${labels.attachBtn}`}
            </button>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic', margin: 0 }}>{labels.noAttachments}</p>
      ) : (
        <div className="attach">
          {attachments.map(att => {
            const ext = att.file_name?.split('.').pop()?.toUpperCase() || 'FILE'
            return (
              <div key={att.id} className="attach-item" style={{ cursor: 'pointer' }} onClick={() => window.open(att.file_url, '_blank', 'noopener')}>
                {att.file_type === 'image'
                  ? <img src={att.file_url} alt={att.file_name} style={{ width: 30, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                  : <div className="fic">{ext}</div>
                }
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                  {att.file_name}
                </span>
                {canEdit && <button
                  onClick={e => { e.stopPropagation(); handleDelete(att.id) }}
                  aria-label={labels.deleteFileConfirm}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0, display: 'flex' }}
                >
                  <X size={14} />
                </button>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
