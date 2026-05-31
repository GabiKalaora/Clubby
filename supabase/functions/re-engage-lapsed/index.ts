import { createClient } from 'jsr:@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const LAPSE_DAYS = 30

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  const cutoff = new Date(Date.now() - LAPSE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Find memberships where the member has had no benefit activity in 30+ days
  // and they have a push token
  const { data: memberships, error: memErr } = await admin
    .from('memberships')
    .select(`
      id,
      user_id,
      business_id,
      businesses ( name ),
      profiles!user_id ( id, display_name, expo_push_token )
    `)
    .eq('active', true)

  if (memErr) {
    return new Response(JSON.stringify({ error: memErr.message }), { status: 500 })
  }

  const messages: { to: string; title: string; body: string; sound: string; data: Record<string, string> }[] = []
  const logEntries: { user_id: string; benefit_id: string | null; type: string; message: string }[] = []

  for (const m of memberships ?? []) {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    if (!profile?.expo_push_token) continue

    // Check last benefit activity at this business
    const { data: recentBenefit } = await admin
      .from('benefits')
      .select('id')
      .eq('user_id', m.user_id)
      .eq('business_id', m.business_id)
      .gte('created_at', cutoff)
      .maybeSingle()

    if (recentBenefit) continue // active — skip

    // Check we haven't sent a re-engage push in the last 30 days
    const { data: recentNotif } = await admin
      .from('notification_log')
      .select('id')
      .eq('user_id', m.user_id)
      .eq('type', 're_engage')
      .gte('sent_at', cutoff)
      .maybeSingle()

    if (recentNotif) continue // already re-engaged recently

    const bizName = (m.businesses as { name: string } | null)?.name ?? 'your club'
    const name = profile.display_name ?? 'there'
    const body = `Hey ${name}, it's been a while! ${bizName} misses you. Come back and check what's new.`

    messages.push({
      to: profile.expo_push_token,
      title: `👋 ${bizName} misses you!`,
      body,
      sound: 'default',
      data: { businessId: String(m.business_id) },
    })
    logEntries.push({
      user_id: profile.id,
      benefit_id: null,
      type: 're_engage',
      message: body,
    })
  }

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    }).catch(console.error)
  }

  if (logEntries.length > 0) {
    await admin.from('notification_log').insert(
      logEntries.map((e) => ({
        ...e,
        sent_at: new Date().toISOString(),
        benefit_id: undefined,
      })),
    )
  }

  return new Response(
    JSON.stringify({ reEngaged: messages.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
