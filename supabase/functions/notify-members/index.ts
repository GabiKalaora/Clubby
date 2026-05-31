import { createClient } from 'jsr:@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const LAPSE_DAYS = 30
const NEW_DAYS = 7

type Cohort = 'all' | 'new' | 'active' | 'lapsed'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const { business_id, message, cohort = 'all' } = await req.json() as {
    business_id: string; message: string; cohort?: Cohort
  }
  if (!business_id || !message?.trim()) {
    return new Response(JSON.stringify({ error: 'business_id and message required' }), { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: biz } = await admin
    .from('businesses')
    .select('id, name')
    .eq('id', business_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!biz) return new Response(JSON.stringify({ error: 'Business not found or unauthorized' }), { status: 403 })

  // Fetch all active members
  const { data: members } = await admin
    .from('memberships')
    .select('user_id, joined_at, profiles!user_id(id, expo_push_token)')
    .eq('business_id', business_id)
    .eq('active', true)

  if (!members || members.length === 0) {
    return new Response(JSON.stringify({ sent: 0, cohort, totalMembers: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const now = Date.now()
  const lapseCutoff = new Date(now - LAPSE_DAYS * 86400_000).toISOString()
  const newCutoff   = new Date(now - NEW_DAYS  * 86400_000).toISOString()

  // For active/lapsed cohorts, fetch last benefit activity per user
  const userLastActivity: Record<string, string> = {}
  if (cohort === 'active' || cohort === 'lapsed') {
    const userIds = members.map(m => m.user_id)
    const { data: benefits } = await admin
      .from('benefits')
      .select('user_id, created_at')
      .eq('business_id', business_id)
      .in('user_id', userIds)
      .gte('created_at', lapseCutoff)
    for (const b of benefits ?? []) {
      if (!userLastActivity[b.user_id] || b.created_at > userLastActivity[b.user_id]) {
        userLastActivity[b.user_id] = b.created_at
      }
    }
  }

  const filtered = members.filter(m => {
    switch (cohort) {
      case 'new':    return m.joined_at >= newCutoff
      case 'active': return !!userLastActivity[m.user_id]
      case 'lapsed': return !userLastActivity[m.user_id]
      default:       return true
    }
  })

  const messages = filtered
    .map(m => {
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

  const logs = filtered.map(m => ({
    user_id: m.user_id,
    type: 'direct_message',
    message: message.trim(),
    sent_at: new Date().toISOString(),
  }))
  if (logs.length > 0) await admin.from('notification_log').insert(logs)

  return new Response(
    JSON.stringify({ sent: messages.length, pushErrors, cohort, totalMembers: filtered.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
