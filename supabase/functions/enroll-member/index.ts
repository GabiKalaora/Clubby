import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth: require a valid user JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service-role client for writes (bypasses RLS for membership + benefit inserts)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // User client to extract caller's user ID
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

    const { token } = await req.json()
    if (!token) {
      return new Response(JSON.stringify({ error: 'token is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Look up business by QR token
    const { data: business, error: bizError } = await adminClient
      .from('businesses')
      .select('id, name, category, description, logo_url')
      .eq('qr_code_token', token)
      .single()

    if (bizError || !business) {
      return new Response(JSON.stringify({ error: 'Invalid QR code' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Upsert membership — idempotent, safe to retry
    const { error: memberError } = await adminClient
      .from('memberships')
      .upsert(
        { user_id: user.id, business_id: business.id, active: true },
        { onConflict: 'user_id,business_id', ignoreDuplicates: false },
      )

    if (memberError) {
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check for an active welcome promotion
    const { data: promo } = await adminClient
      .from('promotions')
      .select('id, title, description, benefit_type, benefit_value, benefit_value_type')
      .eq('business_id', business.id)
      .eq('active', true)
      .lte('valid_from', new Date().toISOString())
      .gte('valid_until', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    let welcomeBenefit = null

    if (promo) {
      // Deterministic UUID — prevents duplicate benefit on QR retry
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
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      }

      if (promo.benefit_type === 'credit') {
        benefitRow.type = 'credit'
        benefitRow.amount_cents = Math.round(Number(promo.benefit_value) * 100)
      } else if (promo.benefit_type === 'discount') {
        benefitRow.type = 'discount'
        benefitRow.discount_percent = Number(promo.benefit_value)
      } else {
        benefitRow.type = 'free_item'
        benefitRow.free_item_description = promo.description
      }

      const { data: inserted, error: benefitError } = await adminClient
        .from('benefits')
        .upsert(benefitRow, { onConflict: 'id', ignoreDuplicates: true })
        .select()
        .maybeSingle()

      if (!benefitError) welcomeBenefit = inserted

      // Increment redemption counter (best-effort)
      await adminClient.rpc('increment_redemption_count', { promo_id: promo.id })
    }

    return new Response(
      JSON.stringify({ business, welcomeBenefit, alreadyMember: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Deterministic UUID v5 using Web Crypto (available in Deno)
async function deterministicUuid(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const bytes = new Uint8Array(hashBuffer)
  // Format as UUID v5
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`
}
