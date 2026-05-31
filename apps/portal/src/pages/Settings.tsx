import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Business, OpeningHours, DayHours } from '../Portal'

interface Props {
  business: Business
  onUpdated: (updated: Business) => void
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type Day = typeof DAYS[number]
const DAY_LABELS: Record<Day, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

type HoursForm = Record<Day, { enabled: boolean; open: string; close: string }>

function buildHoursForm(oh: OpeningHours | null): HoursForm {
  return Object.fromEntries(DAYS.map(d => [
    d,
    oh?.[d]
      ? { enabled: true, open: oh[d]!.open, close: oh[d]!.close }
      : { enabled: false, open: '09:00', close: '18:00' },
  ])) as HoursForm
}

function formToOpeningHours(form: HoursForm): OpeningHours {
  const result: OpeningHours = {}
  for (const d of DAYS) {
    if (form[d].enabled) result[d] = { open: form[d].open, close: form[d].close } as DayHours
  }
  return result
}

export function Settings({ business, onUpdated }: Props) {
  const [logoUrl, setLogoUrl] = useState(business.logo_url ?? '')
  const [name, setName] = useState(business.name)
  const [description, setDescription] = useState(business.description ?? '')
  const [address, setAddress] = useState(business.address ?? '')
  const [phone, setPhone] = useState(business.phone ?? '')
  const [webhookUrl, setWebhookUrl] = useState(business.webhook_url ?? '')
  const [webhookSecret, setWebhookSecret] = useState(business.webhook_secret ?? '')
  const [showSecret, setShowSecret] = useState(false)
  const [hours, setHours] = useState<HoursForm>(() => buildHoursForm(business.opening_hours))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLogoUrl(business.logo_url ?? '')
    setName(business.name)
    setDescription(business.description ?? '')
    setAddress(business.address ?? '')
    setPhone(business.phone ?? '')
    setWebhookUrl(business.webhook_url ?? '')
    setWebhookSecret(business.webhook_secret ?? '')
    setHours(buildHoursForm(business.opening_hours))
    setMessage('')
    setError('')
  }, [business.id])

  function setHoursField(day: Day, field: 'enabled' | 'open' | 'close', value: string | boolean) {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${business.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('business-logos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('business-logos')
      .getPublicUrl(path)

    setLogoUrl(publicUrl)
    setUploading(false)
  }

  function generateSecret() {
    const arr = new Uint8Array(24)
    crypto.getRandomValues(arr)
    setWebhookSecret(Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(''))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    setMessage('')

    const opening_hours = formToOpeningHours(hours)

    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        logo_url: logoUrl.trim() || null,
        webhook_url: webhookUrl.trim() || null,
        webhook_secret: webhookSecret.trim() || null,
        opening_hours: Object.keys(opening_hours).length > 0 ? opening_hours : null,
      })
      .eq('id', business.id)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      const updated: Business = {
        ...business,
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        logo_url: logoUrl.trim() || null,
        webhook_url: webhookUrl.trim() || null,
        webhook_secret: webhookSecret.trim() || null,
        opening_hours: Object.keys(opening_hours).length > 0 ? opening_hours : null,
      }
      onUpdated(updated)
      setMessage('Changes saved!')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <div className="settings-page">
      <h2 className="settings-title">Business Settings</h2>

      {/* Logo section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Business Logo</h3>
        <div className="logo-upload-area">
          <label htmlFor="settings-logo-upload" style={{ cursor: 'pointer', flexShrink: 0 }}>
            <div className="logo-preview" title="Click to upload logo">
              {logoUrl ? (
                <img src={logoUrl} alt="Business logo" className="logo-img" />
              ) : (
                <span className="logo-placeholder">{business.name[0]?.toUpperCase()}</span>
              )}
              <div className="logo-overlay">
                <span>{uploading ? '…' : '📷'}</span>
              </div>
            </div>
          </label>
          <div className="logo-upload-info">
            <p className="logo-upload-hint">Click the circle to upload a logo image.</p>
            <p className="logo-upload-hint">JPG, PNG or WebP · max 2 MB recommended</p>
            <label htmlFor="settings-logo-upload" className="btn-upload" style={{ cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? 'Uploading…' : 'Choose file'}
            </label>
          </div>
          <input
            id="settings-logo-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <label>Or paste an image URL</label>
        <input
          type="url"
          placeholder="https://example.com/logo.png"
          value={logoUrl}
          onChange={e => setLogoUrl(e.target.value)}
        />
      </div>

      {/* Business details section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Business Details</h3>

        <label>Business name *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <label>Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Short description of your business"
        />

        <label>Address</label>
        <input
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="123 Main St, City"
        />

        <label>Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+1 555 000 0000"
        />
      </div>

      {/* Opening hours section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Opening Hours</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Toggle days on/off and set your opening and closing times.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DAYS.map(day => (
            <div key={day} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 10,
              background: hours[day].enabled ? '#f0fdf4' : '#f9fafb',
              border: `1.5px solid ${hours[day].enabled ? '#86efac' : '#e5e7eb'}`,
            }}>
              {/* Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0, width: 'auto', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={hours[day].enabled}
                  onChange={e => setHoursField(day, 'enabled', e.target.checked)}
                  style={{ width: 'auto', margin: 0, cursor: 'pointer', accentColor: '#2ecc71' }}
                />
              </label>
              {/* Day name */}
              <span style={{ width: 90, fontSize: 13, fontWeight: hours[day].enabled ? 600 : 400, color: hours[day].enabled ? '#1a1a2e' : '#9ca3af', flexShrink: 0 }}>
                {DAY_LABELS[day]}
              </span>
              {/* Time inputs */}
              {hours[day].enabled ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <input
                    type="time"
                    value={hours[day].open}
                    onChange={e => setHoursField(day, 'open', e.target.value)}
                    style={{ width: 110, padding: '6px 10px', fontSize: 13 }}
                  />
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>to</span>
                  <input
                    type="time"
                    value={hours[day].close}
                    onChange={e => setHoursField(day, 'close', e.target.value)}
                    style={{ width: 110, padding: '6px 10px', fontSize: 13 }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: 13, color: '#9ca3af' }}>Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Webhook integration section */}
      <div className="settings-section">
        <h3 className="settings-section-title">Custom Backend Integration</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 1.5 }}>
          Optional. When a customer scans your QR code, Clubby will POST to your endpoint
          and use the benefit you return. If left empty or your server is unreachable,
          Clubby falls back to your active promotions automatically.
        </p>

        <label>Webhook URL</label>
        <input
          type="url"
          placeholder="https://your-backend.com/clubby/webhook"
          value={webhookUrl}
          onChange={e => setWebhookUrl(e.target.value)}
        />

        <label style={{ marginTop: 12 }}>
          Signing Secret
          <span style={{ fontWeight: 400, color: '#888', marginLeft: 6, fontSize: 12 }}>
            (sent as <code>X-Clubby-Signature</code> header so you can verify the request)
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type={showSecret ? 'text' : 'password'}
            placeholder="Leave empty to skip signing"
            value={webhookSecret}
            onChange={e => setWebhookSecret(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn-upload"
            onClick={() => setShowSecret(v => !v)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {showSecret ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            className="btn-upload"
            onClick={generateSecret}
            style={{ whiteSpace: 'nowrap' }}
          >
            Generate
          </button>
        </div>

        {webhookUrl && (
          <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534' }}>
            <strong>Clubby will POST to your URL with:</strong>
            <pre style={{ margin: '6px 0 0', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{`{
  "event": "qr_scan",
  "user_id": "<customer uuid>",
  "token": "<qr token>",
  "timestamp": "<unix ms>"
}`}</pre>
            <strong style={{ display: 'block', marginTop: 8 }}>Your server must respond with:</strong>
            <pre style={{ margin: '6px 0 0', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{`{
  "benefit": {
    "type": "credit" | "discount" | "free_item",
    "title": "Welcome back!",
    "amount_cents": 500,        // credit only
    "discount_percent": 20,     // discount only
    "free_item_description": "", // free_item only
    "expires_at": "2026-12-31T00:00:00Z" // optional
  },
  "message": "Custom welcome message" // optional
}`}</pre>
            <p style={{ margin: '8px 0 0' }}>Respond within <strong>5 seconds</strong>. Any error or timeout falls back to generic promotions.</p>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success-msg">{message}</p>}

      <button
        type="button"
        className="btn-save"
        onClick={handleSave}
        disabled={saving || !name.trim()}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
