import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

type RewardType = 'free_item' | 'credit' | 'discount'

type StampCard = {
  id: string
  name: string
  required_stamps: number
  reward_type: RewardType
  reward_title: string
  reward_value: number | null
  active: boolean
}

type StampProgress = {
  user_id: string
  display_name: string | null
  phone: string | null
  current_stamps: number
  completed: boolean
  completed_at: string | null
}

interface Props { business: Business }

const EMPTY_FORM = {
  name: '',
  required_stamps: '10',
  reward_type: 'free_item' as RewardType,
  reward_title: '',
  reward_value: '',
}

function cardToForm(c: StampCard) {
  return {
    name: c.name,
    required_stamps: String(c.required_stamps),
    reward_type: c.reward_type,
    reward_title: c.reward_title,
    reward_value: c.reward_value != null ? String(c.reward_value) : '',
  }
}

export function StampCards({ business }: Props) {
  const [cards, setCards] = useState<StampCard[]>([])
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Stamp management
  const [selectedCard, setSelectedCard] = useState<StampCard | null>(null)
  const [progress, setProgress] = useState<StampProgress[]>([])
  const [progressLoading, setProgressLoading] = useState(false)
  const [stampUserId, setStampUserId] = useState('')
  const [stampResult, setStampResult] = useState<{ msg: string; ok: boolean } | null>(null)
  const [stamping, setStamping] = useState(false)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenuId])

  function load() {
    setLoading(true)
    supabase
      .from('stamp_cards')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCards((data ?? []) as StampCard[])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [business.id])

  async function loadProgress(card: StampCard) {
    setSelectedCard(card)
    setProgressLoading(true)
    setStampResult(null)
    setStampUserId('')
    const { data } = await supabase.rpc('get_stamp_progress', { p_stamp_card_id: card.id })
    setProgress((data ?? []) as StampProgress[])
    setProgressLoading(false)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormMode('create')
    setError('')
  }

  function openEdit(c: StampCard) {
    setForm(cardToForm(c))
    setEditingId(c.id)
    setFormMode('edit')
    setError('')
  }

  function closeForm() {
    setFormMode(null)
    setEditingId(null)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.reward_title.trim()) { setError('Reward title is required'); return }
    const stamps = parseInt(form.required_stamps)
    if (isNaN(stamps) || stamps < 1) { setError('Enter a valid stamp count'); return }

    let reward_value: number | null = null
    if (form.reward_type !== 'free_item') {
      const v = parseInt(form.reward_value)
      if (isNaN(v) || v <= 0) { setError('Enter a valid reward value'); return }
      reward_value = v
    }

    setSaving(true)
    const row = {
      business_id: business.id,
      name: form.name.trim(),
      required_stamps: stamps,
      reward_type: form.reward_type,
      reward_title: form.reward_title.trim(),
      reward_value,
    }

    if (formMode === 'edit' && editingId) {
      const { error: err } = await supabase.from('stamp_cards').update(row).eq('id', editingId)
      setSaving(false)
      if (err) { setError(err.message); return }
    } else {
      const { error: err } = await supabase.from('stamp_cards').insert({ ...row, active: true })
      setSaving(false)
      if (err) { setError(err.message); return }
    }

    closeForm()
    load()
    if (selectedCard?.id === editingId) setSelectedCard(null)
  }

  async function toggleActive(card: StampCard) {
    await supabase.from('stamp_cards').update({ active: !card.active }).eq('id', card.id)
    load()
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await supabase.from('stamp_cards').delete().eq('id', id)
    setDeleting(false)
    setConfirmDeleteId(null)
    if (selectedCard?.id === id) setSelectedCard(null)
    load()
  }

  async function handleAddStamp() {
    if (!selectedCard || !stampUserId.trim()) return
    setStamping(true)
    setStampResult(null)
    const { data, error: err } = await supabase.rpc('record_stamp', {
      p_business_id: business.id,
      p_user_id: stampUserId.trim(),
      p_stamp_card_id: selectedCard.id,
    })
    setStamping(false)
    if (err) {
      setStampResult({ msg: err.message, ok: false })
    } else {
      const d = data as { current_stamps: number; required_stamps: number; completed: boolean; error?: string }
      if (d.error) {
        setStampResult({ msg: d.error, ok: false })
      } else {
        const msg = d.completed
          ? `Card complete! Reward issued. (${d.current_stamps}/${d.required_stamps})`
          : `Stamp added. ${d.current_stamps}/${d.required_stamps} stamps.`
        setStampResult({ msg, ok: true })
        loadProgress(selectedCard)
      }
    }
  }

  function rewardLabel(card: StampCard) {
    if (card.reward_type === 'credit' && card.reward_value != null) return `₪${card.reward_value}`
    if (card.reward_type === 'discount' && card.reward_value != null) return `${card.reward_value}% off`
    return 'Free item'
  }

  const formTitle = formMode === 'edit' ? 'Edit Stamp Card' : 'New Stamp Card'
  const submitLabel = saving ? 'Saving…' : formMode === 'edit' ? 'Save changes' : 'Create card'

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Stamp Cards</h2>
          <p className="page-subtitle">{business.name}</p>
        </div>
        <button className="btn-primary btn-sm" onClick={openCreate}>+ New card</button>
      </div>

      {formMode && (
        <div className="card form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{formTitle}</h3>
          <form onSubmit={handleSubmit}>
            <label>Card name *</label>
            <input placeholder="e.g. Coffee Loyalty Card" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />

            <label>Stamps required to complete *</label>
            <input type="number" min="1" max="100" value={form.required_stamps}
              onChange={e => setForm(f => ({ ...f, required_stamps: e.target.value }))} required />

            <label>Reward type *</label>
            <select value={form.reward_type}
              onChange={e => setForm(f => ({ ...f, reward_type: e.target.value as RewardType, reward_value: '' }))}>
              <option value="free_item">Free item</option>
              <option value="credit">Credit (₪)</option>
              <option value="discount">Discount (%)</option>
            </select>

            <label>Reward title * (shown to customer)</label>
            <input placeholder={form.reward_type === 'free_item' ? 'Free coffee!' : 'Loyalty reward'}
              value={form.reward_title}
              onChange={e => setForm(f => ({ ...f, reward_title: e.target.value }))} required />

            {form.reward_type !== 'free_item' && (
              <>
                <label>{form.reward_type === 'credit' ? 'Credit amount (₪) *' : 'Discount (%) *'}</label>
                <input type="number" min="1" value={form.reward_value}
                  onChange={e => setForm(f => ({ ...f, reward_value: e.target.value }))} required />
              </>
            )}

            {error && <p className="error">{error}</p>}
            <div className="form-row" style={{ marginTop: 16 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}
                disabled={saving || !form.name.trim() || !form.reward_title.trim()}>
                {submitLabel}
              </button>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDeleteId && (
        <div className="card" style={{ marginBottom: 16, background: '#fff5f5', border: '1px solid #fecaca', padding: '14px 16px' }}>
          <p style={{ margin: '0 0 12px', color: '#dc2626', fontWeight: 500 }}>
            Delete this stamp card? All progress will be lost.
          </p>
          <div className="form-row" style={{ gap: 8 }}>
            <button className="btn-primary" style={{ background: '#dc2626', flex: 1 }}
              disabled={deleting} onClick={() => handleDelete(confirmDeleteId)}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button className="btn-secondary" style={{ flex: 1 }}
              onClick={() => setConfirmDeleteId(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedCard ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Cards list */}
        <div>
          {loading ? (
            <div className="spinner" />
          ) : cards.length === 0 ? (
            <div className="empty-state">
              <p>No stamp cards yet. Create one to reward your loyal customers.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Stamps</th>
                    <th>Reward</th>
                    <th>Status</th>
                    <th style={{ width: 48 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map(c => (
                    <tr key={c.id}
                      style={{ cursor: 'pointer', background: selectedCard?.id === c.id ? '#f0fdf4' : undefined }}
                      onClick={() => loadProgress(c)}>
                      <td>{c.name}</td>
                      <td>{c.required_stamps}</td>
                      <td>{rewardLabel(c)}</td>
                      <td>
                        <span className={`badge ${c.active ? 'badge-green' : 'badge-gray'}`}>
                          {c.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ width: 48, textAlign: 'center', position: 'relative' }}
                        onClick={e => e.stopPropagation()}>
                        <button
                          className="btn-link"
                          style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, padding: '2px 8px' }}
                          onClick={() => setOpenMenuId(id => id === c.id ? null : c.id)}
                          aria-label="Actions"
                        >⋯</button>
                        {openMenuId === c.id && (
                          <div ref={menuRef} style={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 50,
                            background: 'white', borderRadius: 10,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                            border: '1px solid #e5e7eb', minWidth: 150, padding: '6px 0',
                          }}>
                            {[
                              { label: 'Edit', action: () => { openEdit(c); setOpenMenuId(null) } },
                              { label: c.active ? 'Deactivate' : 'Activate', action: () => { toggleActive(c); setOpenMenuId(null) } },
                              { label: 'Delete', action: () => { setConfirmDeleteId(c.id); setOpenMenuId(null) }, danger: true },
                            ].map(item => (
                              <button key={item.label} onClick={item.action} style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '9px 16px', background: 'none', border: 'none',
                                fontSize: 14, cursor: 'pointer', margin: 0, borderRadius: 0,
                                color: item.danger ? '#dc2626' : '#333',
                                fontWeight: item.danger ? 600 : 400,
                              }}
                                onMouseEnter={e => (e.currentTarget.style.background = item.danger ? '#fff5f5' : '#f8fafc')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                              >{item.label}</button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Progress panel */}
        {selectedCard && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>
                  {selectedCard.name} — Add stamp
                </h3>
                <button className="btn-link" onClick={() => setSelectedCard(null)} style={{ fontSize: 13 }}>✕ Close</button>
              </div>
              <label style={{ marginTop: 0 }}>Customer user ID</label>
              <input
                placeholder="Paste customer UUID from Members list"
                value={stampUserId}
                onChange={e => setStampUserId(e.target.value)}
              />
              {stampResult && (
                <p style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: stampResult.ok ? '#16a34a' : '#dc2626' }}>
                  {stampResult.msg}
                </p>
              )}
              <button className="btn-primary btn-sm" style={{ marginTop: 12 }}
                disabled={stamping || !stampUserId.trim()}
                onClick={handleAddStamp}>
                {stamping ? 'Adding…' : '+ Add stamp'}
              </button>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>CUSTOMER PROGRESS</p>
              </div>
              {progressLoading ? (
                <div className="spinner" style={{ margin: '20px auto' }} />
              ) : progress.length === 0 ? (
                <p style={{ padding: '20px 16px', color: '#9ca3af', fontSize: 13 }}>No stamps recorded yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Stamps</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map(p => (
                      <tr key={p.user_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.display_name ?? '—'}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.phone ?? ''}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 160 }}>
                              {Array.from({ length: selectedCard.required_stamps }, (_, i) => (
                                <div key={i} style={{
                                  width: 10, height: 10, borderRadius: '50%',
                                  background: i < p.current_stamps ? '#2ecc71' : '#e5e7eb',
                                }} />
                              ))}
                            </div>
                            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>
                              {p.current_stamps}/{selectedCard.required_stamps}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${p.completed ? 'badge-green' : 'badge-gray'}`}>
                            {p.completed ? 'Complete' : 'In progress'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
