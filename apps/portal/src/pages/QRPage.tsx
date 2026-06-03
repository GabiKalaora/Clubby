import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

type Location = {
  id: string
  name: string
  address: string | null
  qr_code_token: string
  active: boolean
}

interface Props { business: Business }

function QRCard({ label, token, appUrl, businessName }: { label: string; token: string; appUrl: string; businessName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const enrollUrl = `${appUrl}/enroll?token=${token}`

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, enrollUrl, {
        width: 200, margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      })
    }
  }, [enrollUrl])

  async function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${businessName.replace(/\s+/g, '-').toLowerCase()}-${label.replace(/\s+/g, '-').toLowerCase()}-qr.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="card" style={{ textAlign: 'center', padding: 20, minWidth: 240 }}>
      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{label}</p>
      <canvas ref={canvasRef} style={{ borderRadius: 8 }} />
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>{enrollUrl}</p>
      <button className="btn-primary btn-sm" style={{ marginTop: 8 }} onClick={download}>⬇ Download</button>
    </div>
  )
}

export function QRPage({ business }: Props) {
  const appUrl = import.meta.env.VITE_APP_URL ?? 'http://localhost:8081'
  const [locations, setLocations] = useState<Location[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '' })
  const [saving, setSaving] = useState(false)

  function load() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).from('business_locations')
      .select('*').eq('business_id', business.id).eq('active', true)
      .order('created_at')
      .then(({ data }: { data: Location[] }) => setLocations(data ?? []))
  }

  useEffect(() => { load() }, [business.id])

  async function addLocation(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('business_locations').insert({
      business_id: business.id,
      name: form.name.trim(),
      address: form.address.trim() || null,
    })
    setSaving(false)
    setForm({ name: '', address: '' })
    setShowForm(false)
    load()
  }

  async function removeLocation(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('business_locations').update({ active: false }).eq('id', id)
    load()
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">QR Codes</h2>
          <p className="page-subtitle">{business.name}</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          + Add location
        </button>
      </div>

      {showForm && (
        <div className="card form-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>New Location</h3>
          <form onSubmit={addLocation}>
            <label>Location name *</label>
            <input placeholder="e.g. Tel Aviv Branch" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <label>Address</label>
            <input placeholder="e.g. Rothschild 22, Tel Aviv" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            <div className="form-row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Creating…' : 'Create QR code'}</button>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* QR grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Main business QR */}
        <div style={{ position: 'relative' }}>
          <QRCard label="Main" token={business.qr_code_token} appUrl={appUrl} businessName={business.name} />
          <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, color: '#94a3b8' }}>Default</span>
        </div>

        {/* Location QRs */}
        {locations.map(loc => (
          <div key={loc.id} style={{ position: 'relative' }}>
            <QRCard label={loc.name} token={loc.qr_code_token} appUrl={appUrl} businessName={business.name} />
            {loc.address && <p style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 4 }}>📍 {loc.address}</p>}
            <button
              onClick={() => { if (confirm(`Remove "${loc.name}"?`)) removeLocation(loc.id) }}
              style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', fontSize: 14, color: '#dc2626', cursor: 'pointer' }}>✕</button>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="card" style={{ marginTop: 24, padding: '14px 20px' }}>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
          <strong>Multi-location:</strong> Each location gets its own QR code but shares the same membership, stamp cards, and benefits. Great for businesses with multiple branches.
        </p>
      </div>
    </div>
  )
}
