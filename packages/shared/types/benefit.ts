// Benefit union type — NEVER store value as generic `numeric`.
// Wallet balance header = sum of amount_cents for type='credit' only.
// Do NOT mix types when computing totals.

type BenefitBase = {
  id: string
  user_id: string
  business_id: string
  promotion_id: string | null
  title: string
  description: string | null
  expires_at: string | null
  redeemed: boolean
  redeemed_at: string | null
  source: 'qr_scan' | 'manual' | 'promotion' | 'store_owner'
  verified: boolean
  created_at: string
}

export type CreditBenefit = BenefitBase & {
  type: 'credit'
  amount_cents: number
  discount_percent: null
  free_item_description: null
}

export type DiscountBenefit = BenefitBase & {
  type: 'discount'
  discount_percent: number
  amount_cents: null
  free_item_description: null
}

export type FreeItemBenefit = BenefitBase & {
  type: 'free_item'
  free_item_description: string
  amount_cents: null
  discount_percent: null
}

export type Benefit = CreditBenefit | DiscountBenefit | FreeItemBenefit

export function walletBalanceCents(benefits: Benefit[]): number {
  return benefits
    .filter((b): b is CreditBenefit => b.type === 'credit' && !b.redeemed)
    .reduce((sum, b) => sum + b.amount_cents, 0)
}

export function formatBenefitValue(b: Benefit): string {
  if (b.type === 'credit') return `$${(b.amount_cents / 100).toFixed(2)}`
  if (b.type === 'discount') return `${b.discount_percent}% off`
  return b.free_item_description
}
