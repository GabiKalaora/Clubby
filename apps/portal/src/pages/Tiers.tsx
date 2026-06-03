import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

type Tier = {
  id: string
  name: string
  min_stamps: number
  color: string
  icon: string
}

const PRESET_ICONS = ['🥉', '🥈', '🥇', '💎', '⭐', '🔥', '👑']
const PRESET_COLORS = ['#cd7f32', '#c0c0c0', '#ffd700', '#b9f2ff', '#ff9500', '#ff3b30', '#5856d6']

const DEFAULT_TIERS = [
  { name: 'Bronze', min_stamps: 0,  color: '#cd7f32', icon: '🥉' },
  { name: 'Silver', min_stamps: 10, color: '#c0c0c0', icon: '🥈' },
  { name: 'Gold',   min_stamps: 25, color: '#ffd700', icon: '🥇' },
]

interface Props { business: Business }

export function Tiers({ business }: Props) {
  const { t } = useTranslation()
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', min_stamps: '', color: '#cd7f32', icon: '🥉' })
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('tiers')
      .select('*')
      .eq('business_id', business.id)
      .order('min_stamps', { ascending: true })
      .then(({ data }: { data: Tier[] }) => {
        setTiers(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [business.id])

  function openCreate() {
    setForm({ name: '', min_stamps: '', color: '#cd7f32', icon: '🥉' })
    setEditingId(null)
    setFormMode('create')
    setError('')
  }

  function openEdit(tier: Tier) {
    setForm({ name: tier.name, min_stamps: String(tier.min_stamps), color: tier.color, icon: tier.icon })
    setEditingId(tier.id)
    setFormMode('edit')
    setError('')
  }

  function closeForm() { setFormMode(null); setEditingId(null); setError('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    const stamps = parseInt(form.min_stamps)
    if (isNaN(stamps) || stamps < 0) { setError('Enter a valid stamp count'); return }

    setSaving(true)
    if (formMode === 'edit' && editingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('tiers').update({
        name: form.name.trim(), min_stamps: stamps, color: form.color, icon: form.icon,
      }).eq('id', editingId)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('tiers').insert({
        business_id: business.id, name: form.name.trim(),
        min_stamps: stamps, color: form.color, icon: form.icon,
      })
    }
    setSaving(false)
    closeForm()
    load()
  }

  async function handleDelete(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tiers').delete().eq('id', id)
    load()
  }

  async function resetDefaults() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tiers').delete().eq('business_id', business.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('tiers').insert(
      DEFAULT_TIERS.map(t => ({ ...t, business_id: business.id }))
    )
    load()
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">🏅 Loyalty Tiers</h2>
          <p className="page-subtitle">{business.name} — reward customers based on stamps earned</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary btn-sm" onClick={resetDefaults}>Reset to defaults</button>
          <button className="btn-primary btn-sm" onClick={openCreate}>+ Add tier</button>
        </div>
      </div>

      {/* How tiers work hint */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac' }}>
        <p style={{ fontSize: 13, color: '#166534', margin: 0, lineHeight: 1.6 }}>
          <strong>How it works:</strong> Customers earn stamps each time you stamp their card. The more stamps they collect, the higher their tier — shown as a badge on their wallet.
        </p>
      </div>

      {formMode && (
        <div className="card form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{formMode === 'edit' ? 'Edit Tier' : 'New Tier'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div style={{ flex: 1 }}>
                <label>Icon</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {PRESET_ICONS.map(ic => (
                    <button
                      key={ic} type="button"
                      onClick={() => setForm(f => ({ ...f, icon: ic }))}
                      style={{
                        fontSize: 22, padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
                        border: form.icon === ic ? '2px solid #2ecc71' : '2px solid transparent',
                        background: form.icon === ic ? '#f0fdf4' : '#f8fafc',
                      }}
                    >{ic}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label>Color</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: form.color === c ? '3px solid #1e293b' : '3px solid transparent',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <label>Tier name *</label>
            <input placeholder="e.g. Silver" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />

            <label>Minimum stamps to reach this tier *</label>
            <input type="number" min="0" placeholder="e.g. 10" value={form.min_stamps}
              onChange={e => setForm(f => ({ ...f, min_stamps: e.target.value }))} required />

            {error && <p className="error">{error}</p>}
            <div className="form-row" style={{ marginTop: 16 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? 'Saving…' : formMode === 'edit' ? 'Save changes' : 'Create tier'}
              </button>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={closeForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : tiers.length === 0 ? (
        <div className="empty-state"><p>No tiers yet. Add tiers to reward loyal customers.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {tiers.map((tier, i) => (
            <div key={tier.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 20px',
              borderBottom: i < tiers.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              {/* Badge preview */}
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: tier.color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
              }}>{tier.icon}</div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>
                  <span style={{ color: tier.color }}>{tier.name}</span>
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  {tier.min_stamps === 0
                    ? 'Starting tier — all new members'
                    : `Unlocked after ${tier.min_stamps} stamps`}
                </p>
              </div>

              {/* Next tier arrow */}
              {i < tiers.length - 1 && (
                <div style={{ fontSize: 13, color: '#94a3b8', flexShrink: 0 }}>
                  → {tiers[i + 1].min_stamps - tier.min_stamps} more stamps
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn-link" style={{ fontSize: 12 }} onClick={() => openEdit(tier)}>Edit</button>
                {tier.min_stamps > 0 && (
                  <button className="btn-link" style={{ fontSize: 12, color: '#dc2626' }}
                    onClick={() => { if (confirm('Delete this tier?')) handleDelete(tier.id) }}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
