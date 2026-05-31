import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Webhook response shape stores must return
interface WebhookBenefit {
  type: 'credit' | 'discount' | 'free_item'
  title: string
  description?: string
  amount_cents?: number
  discount_percent?: number
  free_item_description?: string
  expires_at?: string
}

interface WebhookResponse {
  benefit?: WebhookBenefit
  message?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { token, ref } = await req.json()
    if (!token) {
      return new Response(JSON.stringify({ error: 'token is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch business including webhook fields (only owner can read these via service role)
    const { data: business, error: bizError } = await adminClient
      .from('businesses')
      .select('id, name, category, description, logo_url, webhook_url, webhook_secret')
      .eq('qr_code_token', token)
      .single()

    if (bizError || !business) {
      return new Response(JSON.stringify({ error: 'Invalid QR code' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Upsert membership — idempotent
    const { data: existing } = await adminClient
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('business_id', business.id)
      .maybeSingle()

    const alreadyMember = !!existing

    // Rate limit: max 5 new enrollments per user per minute
    if (!alreadyMember) {
      const rateCutoff = new Date(Date.now() - 60_000).toISOString()
      const { count } = await adminClient
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('joined_at', rateCutoff)

      if ((count ?? 0) >= 5) {
        return new Response(JSON.stringify({ error: 'Too many enrollments. Please wait a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { error: memberError } = await adminClient
      .from('memberships')
      .upsert(
        { user_id: user.id, business_id: business.id, active: true, ...(ref && !alreadyMember ? { referred_by: ref } : {}) },
        { onConflict: 'user_id,business_id', ignoreDuplicates: false },
      )

    if (memberError) {
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Strip internal fields before returning business to client
    const { webhook_url, webhook_secret, ...publicBusiness } = business

    let welcomeBenefit = null
    let webhookMessage: string | undefined

    // ── Webhook path ──────────────────────────────────────────────────────────
    if (webhook_url) {
      const webhookResult = await callStoreWebhook({
        webhookUrl: webhook_url,
        webhookSecret: webhook_secret ?? undefined,
        userId: user.id,
        token,
      })

      if (webhookResult?.benefit) {
        welcomeBenefit = await insertWebhookBenefit({
          adminClient,
          userId: user.id,
          businessId: business.id,
          benefit: webhookResult.benefit,
        })
        webhookMessage = webhookResult.message
      }
      // Webhook returned no benefit or failed → fall through to generic promo below
    }

    // ── Generic promo path (used when no webhook, or webhook returned no benefit) ──
    if (!welcomeBenefit) {
      const now = new Date().toISOString()
      const { data: promo } = await adminClient
        .from('promotions')
        .select('id, title, description, benefit_type, benefit_value, benefit_value_type')
        .eq('business_id', business.id)
        .eq('active', true)
        .or(`valid_from.is.null,valid_from.lte.${now}`)
        .or(`valid_until.is.null,valid_until.gte.${now}`)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (promo) {
        const benefitId = await deterministicUuid(user.id + promo.id)

        const benefitRow: Record<string, unknown> = {
          id: benefitId,
          user_id: user.id,
          business_id: business.id,
          promotion_id: promo.id,
          title: promo.title,
          description: promo.description,
          source: 'qr_scan',
          verified: true,
          redeemed: false,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }

        if (promo.benefit_type === 'credit') {
          benefitRow.type = 'credit'
          benefitRow.amount_cents = Math.round(Number(promo.benefit_value) * 100)
        } else if (promo.benefit_type === 'discount') {
          benefitRow.type = 'discount'
          benefitRow.discount_percent = Number(promo.benefit_value)
        } else {
          benefitRow.type = 'free_item'
          benefitRow.free_item_description = promo.description ?? promo.title
        }

        const { data: inserted, error: benefitError } = await adminClient
          .from('benefits')
          .upsert(benefitRow, { onConflict: 'id', ignoreDuplicates: true })
          .select()
          .maybeSingle()

        if (!benefitError) welcomeBenefit = inserted

        await adminClient.rpc('increment_redemption_count', { promo_id: promo.id })
      }
    }

    // ── Referral reward ───────────────────────────────────────────────────────
    // Issue a benefit to the referrer when a new member joins via their link
    if (ref && !alreadyMember && ref !== user.id) {
      const { data: referrerMembership } = await adminClient
        .from('memberships')
        .select('id')
        .eq('user_id', ref)
        .eq('business_id', business.id)
        .maybeSingle()

      if (referrerMembership) {
        const referralBenefitId = await deterministicUuid(ref + user.id + business.id + 'referral')
        await adminClient.from('benefits').upsert({
          id: referralBenefitId,
          user_id: ref,
          business_id: business.id,
          type: 'discount',
          title: `🎉 Referral reward — friend joined ${business.name}!`,
          discount_percent: 10,
          source: 'referral',
          verified: true,
          redeemed: false,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: true })
      }
    }

    return new Response(
      JSON.stringify({ business: publicBusiness, welcomeBenefit, alreadyMember, webhookMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ── Webhook call with 5s timeout + HMAC signing ────────────────────────────
async function callStoreWebhook({
  webhookUrl,
  webhookSecret,
  userId,
  token,
}: {
  webhookUrl: string
  webhookSecret?: string
  userId: string
  token: string
}): Promise<WebhookResponse | null> {
  try {
    const timestamp = Date.now().toString()
    const body = JSON.stringify({ event: 'qr_scan', user_id: userId, token, timestamp })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Clubby-Timestamp': timestamp,
    }

    if (webhookSecret) {
      headers['X-Clubby-Signature'] = await hmacSha256(webhookSecret, body)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    return await res.json() as WebhookResponse
  } catch {
    // Timeout, network error, or bad JSON — fall back to generic
    return null
  }
}

// ── Insert a benefit returned by the store's webhook ──────────────────────
async function insertWebhookBenefit({
  adminClient,
  userId,
  businessId,
  benefit,
}: {
  // deno-lint-ignore no-explicit-any
  adminClient: any
  userId: string
  businessId: string
  benefit: WebhookBenefit
}) {
  const benefitId = await deterministicUuid(userId + businessId + 'webhook')

  const row: Record<string, unknown> = {
    id: benefitId,
    user_id: userId,
    business_id: businessId,
    title: benefit.title,
    description: benefit.description ?? null,
    source: 'store_owner',
    verified: true,
    redeemed: false,
    expires_at: benefit.expires_at ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    type: benefit.type,
  }

  if (benefit.type === 'credit') row.amount_cents = benefit.amount_cents ?? 0
  if (benefit.type === 'discount') row.discount_percent = benefit.discount_percent ?? 0
  if (benefit.type === 'free_item') row.free_item_description = benefit.free_item_description ?? benefit.title

  const { data, error } = await adminClient
    .from('benefits')
    .upsert(row, { onConflict: 'id', ignoreDuplicates: false })
    .select()
    .maybeSingle()

  if (error) console.error('[webhook benefit upsert error]', JSON.stringify(error))
  if (!data && !error) console.error('[webhook benefit upsert] no data returned, row:', JSON.stringify(row))
  return error ? null : data
}

// ── HMAC-SHA256 using Web Crypto ───────────────────────────────────────────
async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Deterministic UUID v5 ──────────────────────────────────────────────────
async function deterministicUuid(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const bytes = new Uint8Array(hashBuffer)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`
}
