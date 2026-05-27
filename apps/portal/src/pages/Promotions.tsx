import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

type BenefitType = 'credit' | 'discount' | 'free_item'

type Promotion = {
  id: string
  title: string
  description: string | null
  benefit_type: BenefitType
  benefit_value: number | null
  valid_from: string | null
  valid_until: string | null
  max_redemptions: number | null
  redemption_count: number
  active: boolean
}

interface Props { business: Business }

const EMPTY_FORM = {
  title: '', description: '', benefit_type: 'discount' as BenefitType,
  benefit_value: '', valid_from: '', valid_until: '', max_redemptions: '',
}

export function Promotions({ business }: Props) {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    supabase
      .from('promotions')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPromos((data ?? []) as Promotion[])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [business.id])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const isFreeItem = form.benefit_type === 'free_item'
    const value = isFreeItem ? 0 : parseFloat(form.benefit_value)
    if (!isFreeItem && (isNaN(value) || value <= 0)) { setError('Enter a valid value'); setSaving(false); return }

    const row: Record<string, unknown> = {
      business_id: business.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      benefit_type: form.benefit_type,
      benefit_value: isFreeItem ? null : (form.benefit_type === 'credit' ? Math.round(value * 100) : Math.round(value)),
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions) : null,
      active: true,
    }

    const { error: err } = await supabase.from('promotions').insert(row as never)
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm(EMPTY_FORM)
    setShowForm(false)
    load()
  }

  async function toggleActive(promo: Promotion) {
    await supabase.from('promotions').update({ active: !promo.active }).eq('id', promo.id)
    load()
  }

  function valueLabel(promo: Promotion) {
    if (!promo.benefit_value) return '—'
    if (promo.benefit_type === 'credit')   return `₪${(promo.benefit_value / 100).toFixed(0)}`
    if (promo.benefit_type === 'discount') return `${promo.benefit_value}%`
    return String(promo.benefit_value)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Promotions</h2>
          <p className="page-subtitle">{business.name}</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => { setShowForm(true); setError('') }}>
          + New promotion
        </button>
      </div>

      {showForm && (
        <div className="card form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>New Promotion</h3>
          <form onSubmit={handleCreate}>
            <label>Title *</label>
            <input placeholder="e.g. Welcome discount" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />

            <label>Description</label>
            <textarea placeholder="Optional details" value={form.description} rows={2}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

            <label>Benefit type *</label>
            <select value={form.benefit_type}
              onChange={e => setForm(f => ({ ...f, benefit_type: e.target.value as BenefitType }))}>
              <option value="discount">Discount (%)</option>
              <option value="credit">Credit (₪)</option>
              <option value="free_item">Free item</option>
            </select>

            {form.benefit_type !== 'free_item' && (
              <>
                <label>{form.benefit_type === 'credit' ? 'Amount (₪) *' : 'Discount (%) *'}</label>
                <input type="number" min="1" step="any"
                  placeholder={form.benefit_type === 'credit' ? '50' : '20'}
                  value={form.benefit_value}
                  onChange={e => setForm(f => ({ ...f, benefit_value: e.target.value }))} required />
              </>
            )}

            <div className="form-row">
              <div style={{ flex: 1 }}>
                <label>Valid from</label>
                <input type="date" value={form.valid_from}
                  onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Valid until</label>
                <input type="date" value={form.valid_until}
                  onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
            </div>

            <label>Max redemptions (blank = unlimited)</label>
            <input type="number" min="1" placeholder="e.g. 100" value={form.max_redemptions}
              onChange={e => setForm(f => ({ ...f, max_redemptions: e.target.value }))} />

            {error && <p className="error">{error}</p>}
            <div className="form-row" style={{ marginTop: 16 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving || !form.title.trim()}>
                {saving ? 'Saving…' : 'Create promotion'}
              </button>
              <button type="button" className="btn-secondary" style={{ flex: 1 }}
                onClick={() => { setShowForm(false); setError('') }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : promos.length === 0 ? (
        <div className="empty-state">
          <p>No promotions yet. Create one to offer welcome benefits to new members.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Value</th>
                <th>Redemptions</th>
                <th>Valid until</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td className="capitalize">{p.benefit_type.replace('_', ' ')}</td>
                  <td>{valueLabel(p)}</td>
                  <td>{p.redemption_count}{p.max_redemptions ? ` / ${p.max_redemptions}` : ''}</td>
                  <td>{p.valid_until ? p.valid_until.slice(0, 10) : '—'}</td>
                  <td>
                    <span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-link" onClick={() => toggleActive(p)}>
                      {p.active ? 'Deactivate' : 'Activate'}
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
