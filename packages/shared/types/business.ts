export type DayHours = {
  open: string   // "09:00"
  close: string  // "18:00"
}

export type OpeningHours = Partial<
  Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayHours>
>

export type BusinessCategory =
  | 'clothing'
  | 'shoes'
  | 'food'
  | 'service'
  | 'health'
  | 'tech'
  | 'other'

export type Business = {
  id: string
  owner_id: string
  name: string
  category: BusinessCategory
  description: string | null
  logo_url: string | null
  address: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  opening_hours: OpeningHours | null
  qr_code_token: string
  created_at: string
}
