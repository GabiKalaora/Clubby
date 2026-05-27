import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

type Story = {
  id: string
  image_url: string | null
  caption: string | null
  cta_text: string | null
  cta_url: string | null
  expires_at: string
  created_at: string
}

interface Props { business: Business }

const EMPTY_FORM = {
  image_url: '', caption: '', cta_text: '', cta_url: '', expires_hours: '24',
}

function isExpired(expires_at: string) {
  return new Date(expires_at) < new Date()
}

function formatExpiry(expires_at: string) {
  const d = new Date(expires_at)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function Stories({ business }: Props) {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    supabase
      .from('stories')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setStories((data ?? []) as Story[])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [business.id])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.image_url.trim()) { setError('Image URL is required'); return }
    setSaving(true)

    const hours = parseInt(form.expires_hours) || 24
    const expires_at = new Date(Date.now() + hours * 3600 * 1000).toISOString()

    const { error: err } = await supabase.from('stories').insert({
      business_id: business.id,
      image_url: form.image_url.trim(),
      caption: form.caption.trim() || null,
      cta_text: form.cta_text.trim() || null,
      cta_url: form.cta_url.trim() || null,
      expires_at,
    } as never)

    setSaving(false)
    if (err) { setError(err.message); return }
    setForm(EMPTY_FORM)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('stories').delete().eq('id', id)
    load()
  }

  const active = stories.filter(s => !isExpired(s.expires_at))
  const expired = stories.filter(s => isExpired(s.expires_at))

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Stories</h2>
          <p className="page-subtitle">{business.name} — Instagram-style promos (24 h by default)</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => { setShowForm(true); setError('') }}>
          + New story
        </button>
      </div>

      {showForm && (
        <div className="card form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>New Story</h3>
          <form onSubmit={handleCreate}>
            <label>Image URL *</label>
            <input
              placeholder="https://example.com/image.jpg"
              value={form.image_url}
              onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
              required
            />

            <label>Caption</label>
            <input
              placeholder="What's the story about?"
              value={form.caption}
              onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
            />

            <div className="form-row">
              <div style={{ flex: 1 }}>
                <label>CTA button text</label>
                <input
                  placeholder="e.g. Shop Now"
                  value={form.cta_text}
                  onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>CTA URL</label>
                <input
                  placeholder="https://..."
                  value={form.cta_url}
                  onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))}
                />
              </div>
            </div>

            <label>Expires in (hours)</label>
            <input
              type="number" min="1" max="168"
              value={form.expires_hours}
              onChange={e => setForm(f => ({ ...f, expires_hours: e.target.value }))}
            />

            {error && <p className="error">{error}</p>}
            <div className="form-row" style={{ marginTop: 16 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? 'Posting…' : 'Post story'}
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
      ) : stories.length === 0 ? (
        <div className="empty-state">
          <p>No stories yet. Post one to appear in your members' Wallet feed.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12, color: '#27ae60' }}>Active ({active.length})</h3>
              <div className="stories-grid">
                {active.map(s => <StoryCard key={s.id} story={s} onDelete={handleDelete} />)}
              </div>
            </div>
          )}
          {expired.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 12, color: '#999' }}>Expired ({expired.length})</h3>
              <div className="stories-grid">
                {expired.map(s => <StoryCard key={s.id} story={s} onDelete={handleDelete} expired />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StoryCard({ story, onDelete, expired = false }: { story: Story; onDelete: (id: string) => void; expired?: boolean }) {
  return (
    <div className={`story-card ${expired ? 'story-card--expired' : ''}`}>
      {story.image_url && (
        <div className="story-thumb">
          <img src={story.image_url} alt="" />
        </div>
      )}
      <div className="story-body">
        {story.caption && <p className="story-caption">{story.caption}</p>}
        {story.cta_text && (
          <p className="story-cta">
            CTA: <em>{story.cta_text}</em>
          </p>
        )}
        <p className="story-expiry">
          {expired ? 'Expired' : 'Expires'}: {formatExpiry(story.expires_at)}
        </p>
      </div>
      <button className="story-delete" onClick={() => onDelete(story.id)} title="Delete story">✕</button>
    </div>
  )
}
