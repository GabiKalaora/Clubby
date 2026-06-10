import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Allows an external backend (e.g. store POS) to push a benefit
// directly into a Clubby customer's wallet by phone number.
//
// Auth options (checked in order):
//   1. Bearer <CLUBBY_INTEGRATION_KEY>  — dedicated M2M secret, safe to share with store backends
//   2. Bearer <SUPABASE_SERVICE_ROLE_KEY> — internal use only, never give to external systems
//
// Set CLUBBY_INTEGRATION_KEY as a Supabase secret for key rotation without redeployment.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    const serviceRoleKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const integrationKey   = Deno.env.get('CLUBBY_INTEGRATION_KEY') ?? ''

    // Accept dedicated integration key OR service role key (internal tooling)
    const isIntegrationKey = integrationKey && token === integrationKey
    const isServiceKey     = token === serviceRoleKey

    if (!isIntegrationKey && !isServiceKey) {
      return json({ error: 'Unauthorized — invalid or missing integration key' }, 401)
    }

    // Always use service role internally — the external caller never sees this key
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey,
    )

    const body = await req.json()
    const { user_phone, benefit, message } = body

    if (!user_phone || !benefit?.type || !benefit?.title) {
      return json({ error: 'user_phone, benefit.type and benefit.title are required' }, 400)
    }

    // Look up profile by phone (try with and without + prefix)
    const digits = String(user_phone).replace(/\D/g, '')
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, display_name, expo_push_token')
      .or(`phone.eq.${user_phone},phone.eq.${digits},phone.eq.+${digits}`)
      .limit(1)

    if (!profiles || profiles.length === 0) {
      return json({ error: 'User not found for phone: ' + user_phone }, 404)
    }

    const profile = profiles[0]

    // Validate benefit fields
    if (benefit.type === 'credit' && !benefit.amount_cents) {
      return json({ error: 'amount_cents required for credit benefit' }, 400)
    }
    if (benefit.type === 'discount' && !benefit.discount_percent) {
      return json({ error: 'discount_percent required for discount benefit' }, 400)
    }
    if (benefit.type === 'free_item' && !benefit.free_item_description && !benefit.title) {
      return json({ error: 'free_item_description required for free_item benefit' }, 400)
    }

    const expiresAt = benefit.expires_at ??
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    // Insert the benefit
    const benefitRow: Record<string, unknown> = {
      user_id: profile.id,
      type: benefit.type,
      title: benefit.title,
      description: benefit.description ?? null,
      source: 'store_owner',
      verified: true,
      expires_at: expiresAt,
    }

    if (benefit.type === 'credit')     benefitRow.amount_cents = benefit.amount_cents
    if (benefit.type === 'discount')   benefitRow.discount_percent = benefit.discount_percent
    if (benefit.type === 'free_item')  benefitRow.free_item_description = benefit.free_item_description ?? benefit.title

    // business_id: try to find the business by webhook token if passed,
    // else find any business the user is a member of
    if (benefit.business_id) {
      benefitRow.business_id = benefit.business_id
    } else {
      const { data: membership } = await adminClient
        .from('memberships')
        .select('business_id')
        .eq('user_id', profile.id)
        .eq('active', true)
        .limit(1)
        .single()
      if (membership) benefitRow.business_id = membership.business_id
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('benefits')
      .insert(benefitRow)
      .select('id')
      .single()

    if (insertError) {
      return json({ error: insertError.message }, 500)
    }

    // Send push notification if the user has a token
    if (profile.expo_push_token && message) {
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: profile.expo_push_token,
            title: benefit.title,
            body: message,
            data: { benefitId: inserted.id },
          }),
        })
      } catch {
        // Non-fatal — benefit is already inserted
      }
    }

    return json({
      success: true,
      benefit_id: inserted.id,
      user_id: profile.id,
      display_name: profile.display_name,
      message: message ?? null,
    })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
