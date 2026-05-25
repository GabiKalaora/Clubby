import { useState } from 'react'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'

type Category = 'clothing' | 'shoes' | 'food' | 'service' | 'health' | 'tech' | 'other'

interface Props {
  ownerId: string
  onCreated: (businessName: string, token: string) => void
}

export function BusinessForm({ ownerId, onCreated }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const token = nanoid(12)
    const { error } = await supabase.from('businesses').insert({
      owner_id: ownerId,
      name: name.trim(),
      category,
      description: description.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      qr_code_token: token,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      onCreated(name.trim(), token)
    }
  }

  return (
    <div className="page">
      <div className="card form-card">
        <h1>Register Your Business</h1>
        <p className="subtitle">Fill in the details to get your QR code</p>
        <form onSubmit={handleSubmit}>
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
        </form>
      </div>
    </div>
  )
}
