import { createClient } from 'jsr:@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type ExpoMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, string>
  sound?: 'default'
}

Deno.serve(async (req) => {
  // Allow manual invocation via GET (for cron) or POST (for testing)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  // Benefits expiring in 1–7 days, not redeemed, user has a push token
  const { data: benefits, error } = await admin
    .from('benefits')
    .select(`
      id,
      title,
      expires_at,
      type,
      discount_percent,
      amount_cents,
      businesses ( name ),
      profiles!user_id ( id, expo_push_token )
    `)
    .eq('redeemed', false)
    .not('expires_at', 'is', null)
    .gte('expires_at', new Date().toISOString())
    .lte('expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('Query error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!benefits || benefits.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No expiring benefits' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Build push messages — only for users with a token
  const messages: ExpoMessage[] = []
  const logEntries: { user_id: string; benefit_id: string; type: string; message: string }[] = []

  for (const b of benefits) {
    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
    const token = profile?.expo_push_token
    if (!token) continue

    const businessName = Array.isArray(b.businesses)
      ? b.businesses[0]?.name
      : (b.businesses as { name: string } | null)?.name ?? 'a store'

    const daysLeft = Math.ceil(
      (new Date(b.expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )

    let valueText = ''
    if (b.type === 'credit' && b.amount_cents) {
      valueText = `₪${(b.amount_cents / 100).toFixed(0)} credit`
    } else if (b.type === 'discount' && b.discount_percent) {
      valueText = `${b.discount_percent}% discount`
    }

    const body = valueText
      ? `Your ${valueText} at ${businessName} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`
      : `"${b.title}" at ${businessName} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`

    messages.push({
      to: token,
      title: daysLeft <= 1 ? '⚠️ Benefit expires today!' : `⏰ Benefit expiring soon`,
      body,
      sound: 'default',
      data: { benefitId: b.id },
    })

    logEntries.push({
      user_id: profile.id,
      benefit_id: b.id,
      type: 'expiry_reminder',
      message: body,
    })
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No push tokens found' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Send to Expo Push API in chunks of 100
  let pushErrors = 0
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(chunk),
      })
      if (!res.ok) {
        console.error('Expo push error:', await res.text())
        pushErrors++
      }
    } catch (e) {
      console.error('Fetch error:', e)
      pushErrors++
    }
  }

  // Log all attempted sends to notification_log
  if (logEntries.length > 0) {
    const { error: logError } = await admin
      .from('notification_log')
      .insert(logEntries.map((e) => ({ ...e, sent_at: new Date().toISOString() })))
    if (logError) console.error('Log error:', logError)
  }

  return new Response(
    JSON.stringify({ sent: messages.length, pushErrors, loggedEntries: logEntries.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
