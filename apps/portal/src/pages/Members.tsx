import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

type Member = {
  user_id: string
  display_name: string | null
  phone: string | null
  joined_at: string
}

type Cohort = 'all' | 'new' | 'active' | 'lapsed'

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
  const { t } = useTranslation()
  const COHORT_LABELS: Record<Cohort, string> = {
    all:    t('members.audienceAll'),
    new:    t('members.audienceNew'),
    active: t('members.audienceActive'),
    lapsed: t('members.audienceLapsed'),
  }
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showNotify, setShowNotify] = useState(false)
  const [message, setMessage] = useState('')
  const [cohort, setCohort] = useState<Cohort>('all')
  const [sending, setSending] = useState(false)
  const [notifyResult, setNotifyResult] = useState<string | null>(null)

  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [memberBenefits, setMemberBenefits] = useState<MemberBenefit[]>([])
  const [benefitsLoading, setBenefitsLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setLoadError(false)
    supabase
      .rpc('get_business_members', { p_business_id: business.id })
      .then(({ data, error }) => {
        if (error) { setLoadError(true); setLoading(false); return }
        setMembers((data ?? []) as Member[])
        setLoading(false)
      })
      .catch(() => { setLoadError(true); setLoading(false) })
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

  const [redeemingId, setRedeemingId] = useState<string | null>(null)

  async function markRedeemed(benefitId: string) {
    setRedeemingId(benefitId)
    await supabase
      .from('benefits')
      .update({ redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('id', benefitId)
    setMemberBenefits(prev => prev.map(b => b.id === benefitId ? { ...b, redeemed: true, redeemed_at: new Date().toISOString() } : b))
    setRedeemingId(null)
  }

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
      body: JSON.stringify({ business_id: business.id, message: message.trim(), cohort }),
    })

    setSending(false)
    const json = await res.json()
    if (res.ok) {
      setNotifyResult(t('members.notifySent', { count: json.sent }))
      setMessage('')
      setShowNotify(false)
    } else {
      setNotifyResult(`Error: ${json.error}`)
    }
  }

  function downloadCsv() {
    const header = 'Name,Phone,Joined'
    const rows = members.map(m =>
      [
        `"${(m.display_name ?? '').replace(/"/g, '""')}"`,
        `"${(m.phone ?? '').replace(/"/g, '""')}"`,
        new Date(m.joined_at).toLocaleDateString(),
      ].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${business.name.replace(/\s+/g, '_')}_members.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('members.title')}</h2>
          <p className="page-subtitle">{t('members.subtitle', { name: business.name, count: members.length })}</p>
        </div>
        {members.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary btn-sm" onClick={downloadCsv}>
              {t('members.exportCSV')}
            </button>
            <button className="btn-primary btn-sm" onClick={() => { setShowNotify(true); setNotifyResult(null) }}>
              {t('members.notifyMembers')}
            </button>
          </div>
        )}
      </div>

      {showNotify && (
        <div className="card form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>{t('members.notifyTitle')}</h3>
          <form onSubmit={handleNotify}>
            <label>{t('members.audience')}</label>
            <select value={cohort} onChange={e => setCohort(e.target.value as Cohort)} style={{ marginBottom: 12 }}>
              {(Object.keys(COHORT_LABELS) as Cohort[]).map(c => (
                <option key={c} value={c}>{COHORT_LABELS[c]}</option>
              ))}
            </select>
            <label>{t('members.messageLabel')}</label>
            <textarea
              placeholder={t('members.messagePlaceholder')}
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              required
              autoFocus
            />
            <div className="form-row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={sending || !message.trim()}>
              {sending ? 'Sending…' : cohort === 'all' ? t('members.sendToAll', { count: members.length }) : t('members.sendTo', { cohort: COHORT_LABELS[cohort] })}
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
            background: 'var(--surface)', borderRadius: 16, padding: 28,
            width: '100%', maxWidth: 540, maxHeight: '85vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            border: '1px solid var(--border)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  {selectedMember.display_name ?? 'Member'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                  {selectedMember.phone ?? t('members.detail.noPhone')} · {t('members.detail.joined', { date: new Date(selectedMember.joined_at).toLocaleDateString() })}
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
                {t('members.detail.totalCredit', { amount: totalSavings.toFixed(0) })}
              </div>
            )}

            {/* Benefits list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {benefitsLoading ? (
                <div className="spinner" style={{ margin: '24px auto' }} />
              ) : memberBenefits.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                  {t('members.detail.noBenefits')}
                </p>
              ) : (
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>{t('members.detail.columns.benefit')}</th>
                      <th>{t('members.detail.columns.type')}</th>
                      <th>{t('members.detail.columns.value')}</th>
                      <th>{t('members.detail.columns.issued')}</th>
                      <th>{t('members.detail.columns.status')}</th>
                      <th style={{ width: 100 }}></th>
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
                            ? <span className="badge badge-gray">{t('members.detail.used')}</span>
                            : <span className="badge badge-green">{t('members.detail.active')}</span>}
                        </td>
                        <td>
                          {!b.redeemed && (
                            <button
                              className="btn-link"
                              style={{ fontSize: 12, color: '#2ecc71', fontWeight: 600 }}
                              disabled={redeemingId === b.id}
                              onClick={() => markRedeemed(b.id)}
                            >
                              {redeemingId === b.id ? '…' : t('members.detail.redeem')}
                            </button>
                          )}
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
      ) : loadError ? (
        <div className="alert-error" style={{ marginTop: 24 }}>
          Failed to load members. Please refresh the page.
        </div>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <p>{t('members.empty')}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('members.table.num')}</th>
                <th>{t('members.table.name')}</th>
                <th>{t('members.table.phone')}</th>
                <th>{t('members.table.joined')}</th>
                <th style={{ width: 80 }}>{t('members.table.details')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.user_id} style={{ cursor: 'pointer' }} onClick={() => openMember(m)}>
                  <td className="text-muted">{i + 1}</td>
                  <td>{m.display_name ?? <span className="text-muted">{t('members.guestMember')}</span>}</td>
                  <td>{m.phone ?? <span className="text-muted">—</span>}</td>
                  <td className="text-muted">{new Date(m.joined_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-link" style={{ fontSize: 12 }}
                      onClick={e => { e.stopPropagation(); openMember(m) }}>
                      {t('members.table.view')}
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
