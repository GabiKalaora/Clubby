import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { changeLanguage, isHebrew, type SupportedLang } from '../lib/i18n'
import { applyTheme, getStoredTheme } from '../App'
import type { Business, OpeningHours, DayHours } from '../Portal'

function WebhookGuideModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const isHE = i18n.language === 'he'
  const steps = t('webhookGuide.steps', { returnObjects: true }) as string[]
  const errors = t('webhookGuide.errors', { returnObjects: true }) as [string, string][]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 700,
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header — always LTR for the title */}
        <div dir="ltr" style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>📖 {t('webhookGuide.title')}</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{t('webhookGuide.subtitle')}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Scrollable content — always LTR for code, but prose direction follows language */}
        <div dir="ltr" style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24, fontSize: 14, color: '#374151', lineHeight: 1.6, textAlign: 'left' }}>

          {/* How it works */}
          <section>
            <h3 style={H3}>{t('webhookGuide.howItWorks')}</h3>
            <ol style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </section>

          {/* Request */}
          <section>
            <h3 style={H3}>{t('webhookGuide.requestTitle')}</h3>
            <div style={BADGE_ROW}>
              <span style={{ ...BADGE, background: '#2ecc71' }}>POST</span>
              <code style={CODE_INLINE}>https://your-server.com/your-endpoint</code>
            </div>
            <Pre>{`{
  "event": "qr_scan",
  "user_id": "3bae20ea-5114-4dbd-9c55-43d49621f7f5",
  "token": "Olr2j-dMkjVN",
  "timestamp": 1717200000000
}`}</Pre>
            <p style={HINT}>{t('webhookGuide.signatureHint')}</p>
          </section>

          {/* Response */}
          <section>
            <h3 style={H3}>{t('webhookGuide.responseTitle')}</h3>
            <p style={{ margin: '0 0 8px' }}>{t('webhookGuide.responseIntro')}</p>
            <Pre>{`{
  "benefit": {
    "type": "discount",
    "title": "VIP 30% off — welcome back!",
    "discount_percent": 30,
    "expires_at": "2026-12-31T00:00:00Z"
  },
  "message": "Enjoy your exclusive member discount"
}`}</Pre>

            <table style={TABLE}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <Th>{t('webhookGuide.table.type')}</Th>
                <Th>{t('webhookGuide.table.extraField')}</Th>
                <Th>{t('webhookGuide.table.example')}</Th>
              </tr></thead>
              <tbody>
                <tr><Td><Code>credit</Code></Td><Td><Code>amount_cents</Code> (integer)</Td><Td>500 = ₪5</Td></tr>
                <tr><Td><Code>discount</Code></Td><Td><Code>discount_percent</Code> (1–100)</Td><Td>20 = 20% off</Td></tr>
                <tr><Td><Code>free_item</Code></Td><Td><Code>free_item_description</Code></Td><Td>"Free coffee"</Td></tr>
              </tbody>
            </table>
          </section>

          {/* Signature verification */}
          <section>
            <h3 style={H3}>{t('webhookGuide.verifyTitle')}</h3>
            <Pre>{`const crypto = require('crypto')

app.post('/clubby/webhook', (req, res) => {
  const sig = req.headers['x-clubby-signature']
  const expected = crypto
    .createHmac('sha256', process.env.CLUBBY_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')

  if (sig && sig !== expected) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Your logic here...
  res.json({
    benefit: {
      type: 'discount',
      title: '20% welcome discount',
      discount_percent: 20,
    }
  })
})`}</Pre>
          </section>

          {/* Error handling */}
          <section>
            <h3 style={H3}>{t('webhookGuide.errorTitle')}</h3>
            <table style={TABLE}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <Th>{isHE ? 'תרחיש' : 'Scenario'}</Th>
                <Th>{isHE ? 'התנהגות Clubby' : 'Clubby behaviour'}</Th>
              </tr></thead>
              <tbody>
                {errors.map(([s, b]) => <tr key={s}><Td>{s}</Td><Td>{b}</Td></tr>)}
              </tbody>
            </table>
          </section>

          {/* Testing */}
          <section>
            <h3 style={H3}>{t('webhookGuide.testingTitle')}</h3>
            <p style={{ margin: '0 0 8px' }}>{t('webhookGuide.testingText')}</p>
            <Pre>{`npx ngrok http 3000
# Copy the HTTPS URL → paste into Clubby portal Settings`}</Pre>
          </section>

        </div>
      </div>
    </div>
  )
}

const H3: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }
const HINT: React.CSSProperties = { margin: '8px 0 0', fontSize: 12, color: '#64748b', background: '#f8fafc', borderRadius: 6, padding: '8px 10px' }
const BADGE_ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }
const BADGE: React.CSSProperties = { color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: 0.5 }
const TABLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }

function Pre({ children }: { children: string }) {
  return (
    <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, color: '#1e293b', background: '#f1f5f9', borderRadius: 8, padding: '12px 14px', whiteSpace: 'pre', overflowX: 'auto', lineHeight: 1.6 }}>
      {children}
    </pre>
  )
}
function Code({ children }: { children: React.ReactNode }) {
  return <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>{children}</code>
}
function CODE_INLINE_fn(children: React.ReactNode) {
  return <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{children}</code>
}
const CODE_INLINE: React.CSSProperties = { background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', color: '#1e293b' }
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e5e7eb', color: '#64748b', fontSize: 12, fontWeight: 600 }}>{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>{children}</td>
}

interface Props {
  business: Business
  onUpdated: (updated: Business) => void
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type Day = typeof DAYS[number]

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
  const { t, i18n } = useTranslation()
  const [logoUrl, setLogoUrl] = useState(business.logo_url ?? '')
  const [coverUrl, setCoverUrl] = useState(business.cover_url ?? '')
  const [name, setName] = useState(business.name)
  const [description, setDescription] = useState(business.description ?? '')
  const [address, setAddress] = useState(business.address ?? '')
  const [phone, setPhone] = useState(business.phone ?? '')
  const [webhookUrl, setWebhookUrl] = useState(business.webhook_url ?? '')
  const [webhookSecret, setWebhookSecret] = useState(business.webhook_secret ?? '')
  const [showSecret, setShowSecret] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [hours, setHours] = useState<HoursForm>(() => buildHoursForm(business.opening_hours))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLogoUrl(business.logo_url ?? '')
    setCoverUrl(business.cover_url ?? '')
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

  const [uploadingCover, setUploadingCover] = useState(false)

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setError('')

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${business.id}/cover.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('business-covers')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploadingCover(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('business-covers')
      .getPublicUrl(path)

    setCoverUrl(publicUrl)
    setUploadingCover(false)
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
        cover_url: coverUrl.trim() || null,
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
        cover_url: coverUrl.trim() || null,
        webhook_url: webhookUrl.trim() || null,
        webhook_secret: webhookSecret.trim() || null,
        opening_hours: Object.keys(opening_hours).length > 0 ? opening_hours : null,
      }
      onUpdated(updated)
      setMessage(t('settings.savedSuccess'))
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <div className="settings-page">
      <h2 className="settings-title">{t('settings.title')}</h2>

      {/* Logo section */}
      {/* Cover Image section */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t('settings.sections.cover')}</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          {t('settings.cover.hint')}
        </p>
        {coverUrl && (
          <div style={{ width: '100%', height: 120, borderRadius: 10, overflow: 'hidden', marginBottom: 12, background: '#f1f5f9' }}>
            <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="cover-upload" className="btn-upload" style={{ cursor: 'pointer', opacity: uploadingCover ? 0.6 : 1 }}>
            {uploadingCover ? t('settings.cover.uploading') : t('settings.cover.chooseCover')}
          </label>
          <input id="cover-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverFileChange} />
          {coverUrl && (
            <button type="button" className="btn-upload" style={{ color: '#dc2626' }} onClick={() => setCoverUrl('')}>{t('settings.cover.remove')}</button>
          )}
        </div>
        <label style={{ marginTop: 12 }}>{t('settings.cover.pasteUrl')}</label>
        <input type="url" placeholder={t('settings.cover.urlPlaceholder')} value={coverUrl} onChange={e => setCoverUrl(e.target.value)} />
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">{t('settings.sections.logo')}</h3>
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
            <p className="logo-upload-hint">{t('settings.logo.clickToUpload')}</p>
            <p className="logo-upload-hint">{t('settings.logo.formats')}</p>
            <label htmlFor="settings-logo-upload" className="btn-upload" style={{ cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? t('settings.logo.uploading') : t('settings.logo.chooseFile')}
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

        <label>{t('settings.logo.pasteUrl')}</label>
        <input
          type="url"
          placeholder="https://example.com/logo.png"
          value={logoUrl}
          onChange={e => setLogoUrl(e.target.value)}
        />
      </div>

      {/* Business details section */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t('settings.sections.details')}</h3>

        <label>{t('settings.fields.businessName')}</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <label>{t('settings.fields.description')}</label>
        <textarea
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Short description of your business"
        />

        <label>{t('settings.fields.address')}</label>
        <input
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="123 Main St, City"
        />

        <label>{t('settings.fields.phone')}</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+1 555 000 0000"
        />
      </div>

      {/* Opening hours section */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t('settings.sections.hours')}</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          {t('settings.hours.hint')}
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
                {t(`settings.days.${day}`)}
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
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>{t('settings.hours.to')}</span>
                  <input
                    type="time"
                    value={hours[day].close}
                    onChange={e => setHoursField(day, 'close', e.target.value)}
                    style={{ width: 110, padding: '6px 10px', fontSize: 13 }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: 13, color: '#9ca3af' }}>{t('settings.hours.closed')}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Language section */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t('settings.sections.language')}</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>{t('settings.language.hint')}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['en', 'he'] as SupportedLang[]).map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => changeLanguage(lang)}
              style={{
                padding: '8px 20px',
                borderRadius: 20,
                border: '2px solid',
                borderColor: i18n.language === lang ? '#2ecc71' : '#e5e7eb',
                background: i18n.language === lang ? '#f0fdf4' : 'white',
                color: i18n.language === lang ? '#16a34a' : '#666',
                fontWeight: i18n.language === lang ? 700 : 400,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              {lang === 'en' ? t('settings.language.english') : t('settings.language.hebrew')}
            </button>
          ))}
        </div>
      </div>

      {/* Theme section */}
      <div className="settings-section">
        <h3 className="settings-section-title">🌙 Theme</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Choose your preferred display theme</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['auto', 'light', 'dark'] as const).map(th => {
            const stored = getStoredTheme()
            const labels = { auto: '🖥 Auto', light: '☀️ Light', dark: '🌙 Dark' }
            return (
              <button
                key={th} type="button"
                onClick={() => applyTheme(th)}
                style={{
                  padding: '8px 16px', borderRadius: 20, border: '2px solid',
                  borderColor: stored === th ? '#2ecc71' : '#e5e7eb',
                  background: stored === th ? '#f0fdf4' : 'var(--surface)',
                  color: stored === th ? '#16a34a' : 'var(--text2)',
                  fontWeight: stored === th ? 700 : 400,
                  cursor: 'pointer', fontSize: 13,
                }}
              >
                {labels[th]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Webhook integration section */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t('settings.sections.webhook')}</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 1.5 }}>
          {t('settings.webhook.hint')}
        </p>

        <label>{t('settings.webhook.urlLabel')}</label>
        <input
          type="url"
          placeholder="https://your-backend.com/clubby/webhook"
          value={webhookUrl}
          onChange={e => setWebhookUrl(e.target.value)}
        />

        <label style={{ marginTop: 12 }}>
          {t('settings.webhook.secretLabel')}
          <span style={{ fontWeight: 400, color: '#888', marginLeft: 6, fontSize: 12 }}>
            {t('settings.webhook.secretHint')}
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type={showSecret ? 'text' : 'password'}
            placeholder={t('settings.webhook.secretPlaceholder')}
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
            {showSecret ? t('settings.webhook.hide') : t('settings.webhook.show')}
          </button>
          <button
            type="button"
            className="btn-upload"
            onClick={generateSecret}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t('settings.webhook.generate')}
          </button>
        </div>

        {webhookUrl && (
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginTop: 12, padding: '12px 16px', width: '100%',
              background: '#f8fafc', border: '1px solid #e5e7eb',
              borderRadius: 10, cursor: 'pointer', textAlign: 'start',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}
          >
            <span style={{ fontSize: 22 }}>📖</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Webhook Integration Guide</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Request format, response schema, signature verification, and a working Node.js example.
              </p>
            </div>
            <span style={{ fontSize: 16, color: '#94a3b8' }}>→</span>
          </button>
        )}
        {showGuide && <WebhookGuideModal onClose={() => setShowGuide(false)} />}
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success-msg">{message}</p>}

      <button
        type="button"
        className="btn-save"
        onClick={handleSave}
        disabled={saving || !name.trim()}
      >
        {saving ? 'Saving…' : t('settings.saveChanges')}
      </button>
    </div>
  )
}
