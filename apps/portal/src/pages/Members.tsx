import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

type Member = {
  user_id: string
  display_name: string | null
  phone: string | null
  joined_at: string
}

type MemberBenefit = {
  id: string
  title: string
  type: string
  amount_cents: number | null
  discount_percent: number | null
  free_item_description: string | null
  source: string
  redeemed: boolean
  redeemed_at: string | null
  expires_at: string | null
  created_at: string
}

interface Props { business: Business }

function benefitValueLabel(b: MemberBenefit) {
  if (b.type === 'credit' && b.amount_cents != null) return `₪${(b.amount_cents / 100).toFixed(0)}`
  if (b.type === 'discount' && b.discount_percent != null) return `${b.discount_percent}%`
  if (b.type === 'free_item') return b.free_item_description ?? '—'
  return '—'
}

export function Members({ business }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showNotify, setShowNotify] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [notifyResult, setNotifyResult] = useState<string | null>(null)

  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [memberBenefits, setMemberBenefits] = useState<MemberBenefit[]>([])
  const [benefitsLoading, setBenefitsLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    supabase
      .rpc('get_business_members', { p_business_id: business.id })
      .then(({ data }) => {
        setMembers((data ?? []) as Member[])
        setLoading(false)
      })
  }, [business.id])

  function openMember(m: Member) {
    setSelectedMember(m)
    setMemberBenefits([])
    setBenefitsLoading(true)
    supabase
      .rpc('get_member_benefits', { p_business_id: business.id, p_user_id: m.user_id })
      .then(({ data }) => {
        setMemberBenefits((data ?? []) as MemberBenefit[])
        setBenefitsLoading(false)
      })
  }

  function closeMember() {
    setSelectedMember(null)
    setMemberBenefits([])
  }

  const totalSavings = memberBenefits.reduce((sum, b) => {
    if (b.type === 'credit' && b.amount_cents != null) return sum + b.amount_cents / 100
    return sum
  }, 0)

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

      {/* Member detail modal */}
      {selectedMember && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) closeMember() }}
        >
          <div style={{
            background: 'white', borderRadius: 16, padding: 28,
            width: '100%', maxWidth: 540, maxHeight: '85vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
                  {selectedMember.display_name ?? 'Member'}
                </h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>
                  {selectedMember.phone ?? 'No phone'} · Joined {new Date(selectedMember.joined_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={closeMember}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer', width: 'auto', margin: 0, padding: 4 }}
              >
                ×
              </button>
            </div>

            {totalSavings > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                Total credit issued: ₪{totalSavings.toFixed(0)}
              </div>
            )}

            {/* Benefits list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {benefitsLoading ? (
                <div className="spinner" style={{ margin: '24px auto' }} />
              ) : memberBenefits.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                  No benefits issued yet.
                </p>
              ) : (
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Benefit</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Issued</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberBenefits.map(b => (
                      <tr key={b.id}>
                        <td style={{ maxWidth: 160 }}>{b.title}</td>
                        <td className="capitalize">{b.type.replace('_', ' ')}</td>
                        <td>{benefitValueLabel(b)}</td>
                        <td className="text-muted">{new Date(b.created_at).toLocaleDateString()}</td>
                        <td>
                          {b.redeemed
                            ? <span className="badge badge-gray">Used</span>
                            : <span className="badge badge-green">Active</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
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
                <th style={{ width: 80 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.user_id} style={{ cursor: 'pointer' }} onClick={() => openMember(m)}>
                  <td className="text-muted">{i + 1}</td>
                  <td>{m.display_name ?? <span className="text-muted">—</span>}</td>
                  <td>{m.phone ?? <span className="text-muted">—</span>}</td>
                  <td className="text-muted">{new Date(m.joined_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-link" style={{ fontSize: 12 }}
                      onClick={e => { e.stopPropagation(); openMember(m) }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
