import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

type FeedPost = {
  id: string
  type: 'promotion' | 'announcement' | 'story' | 'offer'
  title: string
  body: string | null
  image_url: string | null
  cta_text: string | null
  expires_at: string | null
  active: boolean
  created_at: string
}

const TYPES = ['promotion', 'offer', 'announcement', 'story'] as const
const TYPE_LABELS: Record<string, string> = {
  promotion: '🎁 Promotion',
  offer: '💰 Offer',
  announcement: '📢 Announcement',
  story: '📸 Story',
}
const TYPE_COLORS: Record<string, string> = {
  promotion: '#2ecc71',
  offer: '#f59e0b',
  announcement: '#6366f1',
  story: '#ec4899',
}

const EMPTY = { type: 'offer' as const, title: '', body: '', image_url: '', cta_text: '', expires_at: '' }

interface Props { business: Business }

export function FeedPosts({ business }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('feed_posts')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: FeedPost[] }) => {
        setPosts(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [business.id])

  function openCreate() {
    setForm(EMPTY); setEditingId(null); setFormMode('create'); setError('')
  }

  function openEdit(p: FeedPost) {
    setForm({ type: p.type, title: p.title, body: p.body ?? '', image_url: p.image_url ?? '', cta_text: p.cta_text ?? '', expires_at: p.expires_at ? p.expires_at.slice(0, 10) : '' })
    setEditingId(p.id); setFormMode('edit'); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    const row = {
      business_id: business.id,
      type: form.type,
      title: form.title.trim(),
      body: form.body.trim() || null,
      image_url: form.image_url.trim() || null,
      cta_text: form.cta_text.trim() || null,
      expires_at: form.expires_at || null,
      active: true,
    }
    try {
      if (formMode === 'edit' && editingId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase as any).from('feed_posts').update(row).eq('id', editingId)
        if (err) throw err
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase as any).from('feed_posts').insert(row)
        if (err) throw err
      }
      setFormMode(null)
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(id: string, active: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('feed_posts').update({ active }).eq('id', id)
    load()
  }

  async function deletePost(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('feed_posts').delete().eq('id', id)
    load()
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">📣 Feed Posts</h2>
          <p className="page-subtitle">{business.name} — posts that appear in your members' wallet feed</p>
        </div>
        <button className="btn-primary btn-sm" onClick={openCreate}>+ New post</button>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <p style={{ fontSize: 13, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>
          <strong>How it works:</strong> Posts appear in the "Updates" section of your members' wallet. They see posts only from businesses they've joined. Posts expire automatically on the date you set.
        </p>
      </div>

      {formMode && (
        <div className="card form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{formMode === 'edit' ? 'Edit Post' : 'New Post'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div style={{ flex: 1 }}>
                <label>Post type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof EMPTY['type'] }))}>
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <label>Title *</label>
                <input placeholder="e.g. ☕ Happy Hour — 20% off all drinks" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
            </div>

            <label>Body text</label>
            <textarea placeholder="Optional details shown under the title" value={form.body} rows={2}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />

            <div className="form-row">
              <div style={{ flex: 1 }}>
                <label>Image URL (optional)</label>
                <input type="url" placeholder="https://example.com/image.jpg" value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label>CTA Button text (optional)</label>
                <input placeholder="e.g. Join now" value={form.cta_text}
                  onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Expires on (optional)</label>
                <input type="date" value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>
            </div>

            {error && <p className="error">{error}</p>}
            <div className="form-row" style={{ marginTop: 16 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving || !form.title.trim()}>
                {saving ? 'Saving…' : formMode === 'edit' ? 'Save changes' : 'Publish post'}
              </button>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setFormMode(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="spinner" /> : posts.length === 0 ? (
        <div className="empty-state"><p>No feed posts yet. Create one to engage your members.</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th><th>Type</th><th>CTA</th><th>Expires</th><th>Status</th><th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <tr key={p.id}>
                  <td style={{ maxWidth: 200 }}>{p.title}</td>
                  <td>
                    <span style={{ background: TYPE_COLORS[p.type] + '20', color: TYPE_COLORS[p.type], padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {TYPE_LABELS[p.type]}
                    </span>
                  </td>
                  <td className="text-muted">{p.cta_text ?? '—'}</td>
                  <td className="text-muted">{p.expires_at ? p.expires_at.slice(0, 10) : '—'}</td>
                  <td><span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>{p.active ? 'Active' : 'Paused'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-link" style={{ fontSize: 12 }} onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn-link" style={{ fontSize: 12 }} onClick={() => toggleActive(p.id, !p.active)}>
                        {p.active ? 'Pause' : 'Activate'}
                      </button>
                      <button className="btn-link" style={{ fontSize: 12, color: '#dc2626' }}
                        onClick={() => { if (confirm('Delete this post?')) deletePost(p.id) }}>Delete</button>
                    </div>
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
