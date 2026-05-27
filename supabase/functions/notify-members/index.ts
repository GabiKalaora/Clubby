import { createClient } from 'jsr:@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verify caller owns the business
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const { business_id, message } = await req.json()
  if (!business_id || !message?.trim()) {
    return new Response(JSON.stringify({ error: 'business_id and message required' }), { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  // Ownership check
  const { data: biz } = await admin
    .from('businesses')
    .select('id, name')
    .eq('id', business_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!biz) return new Response(JSON.stringify({ error: 'Business not found or unauthorized' }), { status: 403 })

  // Fetch all active members with a push token
  const { data: members } = await admin
    .from('memberships')
    .select('user_id, profiles!user_id(id, expo_push_token)')
    .eq('business_id', business_id)
    .eq('active', true)

  if (!members || members.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No members' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const messages = members
    .map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      return profile?.expo_push_token
        ? { to: profile.expo_push_token, title: biz.name, body: message.trim(), sound: 'default' }
        : null
    })
    .filter(Boolean)

  let pushErrors = 0
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      })
      if (!res.ok) pushErrors++
    } catch { pushErrors++ }
  }

  // Log to notification_log for all members (regardless of push token)
  const logs = members.map((m) => ({
    user_id: m.user_id,
    type: 'direct_message',
    message: message.trim(),
    sent_at: new Date().toISOString(),
  }))
  await admin.from('notification_log').insert(logs)

  return new Response(
    JSON.stringify({ sent: messages.length, pushErrors, totalMembers: members.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
