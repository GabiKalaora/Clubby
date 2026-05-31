import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

interface Props { business: Business }

const CODE_TTL = 60 // must match mobile

// HMAC-SHA256 (Web Crypto) — same algorithm as mobile
async function computeCode(benefitId: string, userId: string, window: number): Promise<string> {
  const msg = `${benefitId}:${window}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(userId),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  const arr = new Uint8Array(sig)
  const num = ((arr[0] << 16) | (arr[1] << 8) | arr[2]) % 1_000_000
  return String(num).padStart(6, '0')
}

type VerifyResult = {
  ok: boolean
  benefitTitle?: string
  memberName?: string
  valueLabel?: string
  message: string
}

export function VerifyRedemption({ business }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const clean = code.replace(/\s/g, '')
    if (clean.length !== 6) return
    setLoading(true)
    setResult(null)

    // Fetch all unredeemed benefits for this business
    const { data: benefits, error } = await supabase
      .from('benefits')
      .select('id, user_id, title, type, amount_cents, discount_percent, free_item_description')
      .eq('business_id', business.id)
      .eq('redeemed', false)

    if (error) {
      setLoading(false)
      setResult({ ok: false, message: error.message })
      return
    }

    const now = Math.floor(Date.now() / 1000 / CODE_TTL)
    let matched: typeof benefits[0] | null = null

    // Check current window and previous (for clock drift)
    for (const benefit of benefits ?? []) {
      for (const w of [now, now - 1]) {
        const expected = await computeCode(benefit.id, benefit.user_id, w)
        if (expected === clean) {
          matched = benefit
          break
        }
      }
      if (matched) break
    }

    if (!matched) {
      setLoading(false)
      setResult({ ok: false, message: 'Code not found or expired. Ask the customer to regenerate.' })
      return
    }

    // Fetch member name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', matched.user_id)
      .single()

    // Mark as redeemed
    const { error: updateErr } = await supabase
      .from('benefits')
      .update({ redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('id', matched.id)

    setLoading(false)

    if (updateErr) {
      setResult({ ok: false, message: updateErr.message })
      return
    }

    function vLabel(b: typeof matched): string {
      if (!b) return ''
      if (b.type === 'credit' && b.amount_cents != null) return `₪${(b.amount_cents / 100).toFixed(0)}`
      if (b.type === 'discount' && b.discount_percent != null) return `${b.discount_percent}% off`
      return b.free_item_description ?? b.title
    }

    setResult({
      ok: true,
      benefitTitle: matched.title,
      memberName: profile?.display_name ?? 'Customer',
      valueLabel: vLabel(matched),
      message: 'Redemption confirmed!',
    })
    setCode('')
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Verify Redemption</h2>
          <p className="page-subtitle">{business.name}</p>
        </div>
      </div>

      <div className="card form-card">
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
          When a customer taps <strong>Use</strong> in the app, they see a 6-digit code.
          Enter it here to verify and confirm the redemption.
        </p>

        <form onSubmit={handleVerify}>
          <label>6-digit code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={7}
            placeholder="000 000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9\s]/g, ''))}
            style={{ fontSize: 28, letterSpacing: 6, textAlign: 'center', fontFamily: 'monospace' }}
          />

          <button type="submit" className="btn-primary"
            style={{ marginTop: 16 }}
            disabled={loading || code.replace(/\s/g, '').length !== 6}>
            {loading ? 'Verifying…' : 'Verify & Redeem'}
          </button>
        </form>

        {result && (
          <div style={{
            marginTop: 20,
            padding: '16px 20px',
            borderRadius: 12,
            background: result.ok ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result.ok ? '#86efac' : '#fca5a5'}`,
          }}>
            {result.ok ? (
              <>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>
                  ✅ {result.message}
                </p>
                <p style={{ fontSize: 15, color: '#333' }}>
                  <strong>{result.memberName}</strong> — {result.benefitTitle} ({result.valueLabel})
                </p>
              </>
            ) : (
              <p style={{ fontSize: 14, fontWeight: 600, color: '#dc2626' }}>
                ❌ {result.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16, padding: '14px 20px' }}>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          <strong>How it works:</strong> Each code is valid for 60 seconds and is unique to
          the benefit and the customer. Codes cannot be reused after redemption.
        </p>
      </div>
    </div>
  )
}
