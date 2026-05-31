import { useEffect, useRef, useState } from 'react'
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

function promoToForm(p: Promotion) {
  let bv = ''
  if (p.benefit_value != null) {
    bv = p.benefit_type === 'credit'
      ? String(p.benefit_value / 100)
      : String(p.benefit_value)
  }
  return {
    title: p.title,
    description: p.description ?? '',
    benefit_type: p.benefit_type,
    benefit_value: bv,
    valid_from: p.valid_from ? p.valid_from.slice(0, 10) : '',
    valid_until: p.valid_until ? p.valid_until.slice(0, 10) : '',
    max_redemptions: p.max_redemptions != null ? String(p.max_redemptions) : '',
  }
}

function buildRow(form: typeof EMPTY_FORM, businessId: string) {
  const isFreeItem = form.benefit_type === 'free_item'
  const value = isFreeItem ? 0 : parseFloat(form.benefit_value)
  return {
    business_id: businessId,
    title: form.title.trim(),
    description: form.description.trim() || null,
    benefit_type: form.benefit_type,
    benefit_value: isFreeItem ? null : (form.benefit_type === 'credit' ? Math.round(value * 100) : Math.round(value)),
    valid_from: form.valid_from || null,
    valid_until: form.valid_until || null,
    max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions) : null,
  }
}

export function Promotions({ business }: Props) {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  // form mode: 'create' | 'edit' | null
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // kebab menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

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

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormMode('create')
    setError('')
  }

  function openEdit(p: Promotion) {
    setForm(promoToForm(p))
    setEditingId(p.id)
    setFormMode('edit')
    setError('')
  }

  function openDuplicate(p: Promotion) {
    const f = promoToForm(p)
    setForm({ ...f, title: `${f.title} (copy)` })
    setEditingId(null)
    setFormMode('create')
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
    if (!form.title.trim()) { setError('Title is required'); return }
    const isFreeItem = form.benefit_type === 'free_item'
    const value = isFreeItem ? 0 : parseFloat(form.benefit_value)
    if (!isFreeItem && (isNaN(value) || value <= 0)) { setError('Enter a valid value'); return }

    setSaving(true)

    if (formMode === 'edit' && editingId) {
      const row = buildRow(form, business.id)
      const { error: err } = await supabase.from('promotions').update(row).eq('id', editingId)
      setSaving(false)
      if (err) { setError(err.message); return }
    } else {
      const row = { ...buildRow(form, business.id), active: true, redemption_count: 0 }
      const { error: err } = await supabase.from('promotions').insert(row as never)
      setSaving(false)
      if (err) { setError(err.message); return }
    }

    closeForm()
    load()
  }

  async function toggleActive(promo: Promotion) {
    await supabase.from('promotions').update({ active: !promo.active }).eq('id', promo.id)
    load()
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await supabase.from('promotions').delete().eq('id', id)
    setDeleting(false)
    setConfirmDeleteId(null)
    load()
  }

  function valueLabel(promo: Promotion) {
    if (promo.benefit_value == null) return '—'
    if (promo.benefit_type === 'credit')   return `₪${(promo.benefit_value / 100).toFixed(0)}`
    if (promo.benefit_type === 'discount') return `${promo.benefit_value}%`
    return '—'
  }

  const formTitle = formMode === 'edit' ? 'Edit Promotion' : 'New Promotion'
  const submitLabel = saving ? 'Saving…' : formMode === 'edit' ? 'Save changes' : 'Create promotion'

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Promotions</h2>
          <p className="page-subtitle">{business.name}</p>
        </div>
        <button className="btn-primary btn-sm" onClick={openCreate}>+ New promotion</button>
      </div>

      {formMode && (
        <div className="card form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{formTitle}</h3>
          <form onSubmit={handleSubmit}>
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
              <button type="submit" className="btn-primary" style={{ flex: 1 }}
                disabled={saving || !form.title.trim()}>
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
            Delete this promotion? This cannot be undone. Issued benefits won't be affected.
          </p>
          <div className="form-row" style={{ gap: 8 }}>
            <button className="btn-primary" style={{ background: '#dc2626', flex: 1 }}
              disabled={deleting} onClick={() => handleDelete(confirmDeleteId)}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button className="btn-secondary" style={{ flex: 1 }}
              onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : promos.length === 0 ? (
        <div className="empty-state">
          <p>No promotions yet. Create one to offer welcome benefits to new members.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'visible' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Value</th>
                <th>Redemptions</th>
                <th>Valid until</th>
                <th>Status</th>
                <th style={{ width: 48 }}></th>
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
                  <td style={{ width: 48, textAlign: 'center', position: 'relative' }}>
                    <button
                      className="btn-link"
                      style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, padding: '2px 8px' }}
                      onClick={() => setOpenMenuId(id => id === p.id ? null : p.id)}
                      aria-label="Actions"
                    >⋯</button>
                    {openMenuId === p.id && (
                      <div
                        ref={menuRef}
                        style={{
                          position: 'absolute', right: 0, top: '100%', zIndex: 50,
                          background: 'white', borderRadius: 10,
                          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                          border: '1px solid #e5e7eb',
                          minWidth: 150, padding: '6px 0',
                        }}
                      >
                        {[
                          { label: 'Edit', action: () => { openEdit(p); setOpenMenuId(null) } },
                          { label: 'Duplicate', action: () => { openDuplicate(p); setOpenMenuId(null) } },
                          { label: p.active ? 'Deactivate' : 'Activate', action: () => { toggleActive(p); setOpenMenuId(null) } },
                          { label: 'Delete', action: () => { setConfirmDeleteId(p.id); setOpenMenuId(null) }, danger: true },
                        ].map(item => (
                          <button
                            key={item.label}
                            onClick={item.action}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '9px 16px', background: 'none', border: 'none',
                              fontSize: 14, cursor: 'pointer', margin: 0, borderRadius: 0,
                              color: item.danger ? '#dc2626' : '#333',
                              fontWeight: item.danger ? 600 : 400,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = item.danger ? '#fff5f5' : '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            {item.label}
                          </button>
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
  )
}
