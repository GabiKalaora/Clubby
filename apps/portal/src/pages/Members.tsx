import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

type Member = {
  user_id: string
  display_name: string | null
  phone: string | null
  joined_at: string
}

interface Props { business: Business }

export function Members({ business }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showNotify, setShowNotify] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [notifyResult, setNotifyResult] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    supabase
      .rpc('get_business_members', { p_business_id: business.id })
      .then(({ data }) => {
        setMembers((data ?? []) as Member[])
        setLoading(false)
      })
  }, [business.id])

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setNotifyResult(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setNotifyResult('Session expired. Please refresh the page and log in again.')
      setSending(false)
      return
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'

    const res = await fetch(`${supabaseUrl}/functions/v1/notify-members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ business_id: business.id, message: message.trim() }),
    })

    setSending(false)
    const json = await res.json()
    if (res.ok) {
      setNotifyResult(`✓ Notification sent to ${json.sent} member${json.sent !== 1 ? 's' : ''}`)
      setMessage('')
      setShowNotify(false)
    } else {
      setNotifyResult(`Error: ${json.error}`)
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Members</h2>
          <p className="page-subtitle">{business.name} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {members.length > 0 && (
          <button className="btn-primary btn-sm" onClick={() => { setShowNotify(true); setNotifyResult(null) }}>
            📣 Notify all
          </button>
        )}
      </div>

      {showNotify && (
        <div className="card form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Send message to all members</h3>
          <form onSubmit={handleNotify}>
            <label>Message *</label>
            <textarea
              placeholder="e.g. This weekend only — 20% off everything!"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              required
              autoFocus
            />
            <div className="form-row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={sending || !message.trim()}>
                {sending ? 'Sending…' : `Send to ${members.length} member${members.length !== 1 ? 's' : ''}`}
              </button>
              <button type="button" className="btn-secondary" style={{ flex: 1 }}
                onClick={() => setShowNotify(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {notifyResult && (
        <div className={`card ${notifyResult.startsWith('✓') ? 'alert-success' : 'alert-error'}`}
          style={{ marginBottom: 16 }}>
          <p>{notifyResult}</p>
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : members.length === 0 ? (
        <div className="empty-state">
          <p>No members yet. Share your QR code to start growing your club!</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.user_id}>
                  <td className="text-muted">{i + 1}</td>
                  <td>{m.display_name ?? <span className="text-muted">—</span>}</td>
                  <td>{m.phone ?? <span className="text-muted">—</span>}</td>
                  <td className="text-muted">{new Date(m.joined_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
