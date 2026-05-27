import { useState } from 'react'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'

type Category = 'clothing' | 'shoes' | 'food' | 'service' | 'health' | 'tech' | 'other'

interface Props {
  ownerId: string
  onCreated: (businessName: string, token: string, id: string) => void
  onCancel?: () => void
}

export function BusinessForm({ ownerId, onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const token = nanoid(12)
    const { data: created, error: insertError } = await supabase.from('businesses').insert({
      owner_id: ownerId,
      name: name.trim(),
      category,
      description: description.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      qr_code_token: token,
    }).select('id').single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Upload logo if provided
    if (logoFile) {
      const ext = logoFile.name.split('.').pop() ?? 'jpg'
      const path = `${created.id}/logo.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(path, logoFile, { upsert: true })

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('business-logos')
          .getPublicUrl(path)
        await supabase.from('businesses').update({ logo_url: publicUrl }).eq('id', created.id)
      }
    }

    setLoading(false)
    onCreated(name.trim(), token, created.id)
  }

  return (
    <div className="page">
      <div className="card form-card">
        <h1>Register Your Business</h1>
        <p className="subtitle">Fill in the details to get your QR code</p>
        <form onSubmit={handleSubmit}>

          {/* Logo upload */}
          <label>Business Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <label htmlFor="logo-upload" style={{ cursor: 'pointer', flexShrink: 0 }}>
              <div
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#f3f4f6', border: '2px dashed #e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 28 }}>📷</span>
                )}
              </div>
            </label>
            <div>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                {logoPreview ? 'Click to change' : 'Optional — customers will see this logo'}
              </p>
              <label htmlFor="logo-upload" className="btn-upload" style={{ cursor: 'pointer' }}>
                {logoPreview ? 'Change photo' : 'Upload logo'}
              </label>
            </div>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <label>Business name *</label>
          <input
            type="text"
            placeholder="e.g. Java House"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <label>Category *</label>
          <select value={category} onChange={e => setCategory(e.target.value as Category)}>
            <option value="food">Food</option>
            <option value="clothing">Clothing</option>
            <option value="shoes">Shoes</option>
            <option value="service">Service</option>
            <option value="health">Health</option>
            <option value="tech">Tech</option>
            <option value="other">Other</option>
          </select>

          <label>Description</label>
          <textarea
            placeholder="Short description of your business"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />

          <label>Address</label>
          <input
            type="text"
            placeholder="123 Main St, City"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />

          <label>Phone</label>
          <input
            type="tel"
            placeholder="+1 555 000 0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating…' : 'Create business & get QR code'}
          </button>
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
