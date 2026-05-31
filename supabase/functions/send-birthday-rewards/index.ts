import { createClient } from 'jsr:@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  // Find all profiles whose birthday is today (month + day match)
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()

  const { data: profiles, error: profileErr } = await admin
    .from('profiles')
    .select('id, display_name, expo_push_token, date_of_birth, notification_prefs')
    .not('date_of_birth', 'is', null)

  if (profileErr) {
    return new Response(JSON.stringify({ error: profileErr.message }), { status: 500 })
  }

  const birthdayUsers = (profiles ?? []).filter((p) => {
    if (!p.date_of_birth) return false
    const dob = new Date(p.date_of_birth)
    return dob.getMonth() + 1 === month && dob.getDate() === day
  })

  if (birthdayUsers.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No birthdays today' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let totalBenefits = 0
  let totalPushes = 0
  const logEntries: { user_id: string; benefit_id: string; type: string; message: string }[] = []
  const messages: { to: string; title: string; body: string; sound: string }[] = []

  for (const profile of birthdayUsers) {
    // Find all their active memberships
    const { data: memberships } = await admin
      .from('memberships')
      .select('business_id, businesses(name)')
      .eq('user_id', profile.id)
      .eq('active', true)

    for (const m of memberships ?? []) {
      const bizName = (m.businesses as { name: string } | null)?.name ?? 'your club'

      // Check: have we already sent a birthday benefit today for this business?
      const { data: existing } = await admin
        .from('benefits')
        .select('id')
        .eq('user_id', profile.id)
        .eq('business_id', m.business_id)
        .eq('source', 'birthday')
        .gte('created_at', new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString())
        .maybeSingle()

      if (existing) continue

      // Insert birthday benefit
      const title = `🎂 Happy birthday from ${bizName}!`
      const { data: newBenefit, error: insertErr } = await admin
        .from('benefits')
        .insert({
          user_id: profile.id,
          business_id: m.business_id,
          type: 'free_item',
          title,
          free_item_description: 'Birthday surprise — redeem in-store!',
          source: 'birthday',
          verified: true,
          redeemed: false,
        })
        .select('id')
        .single()

      if (insertErr || !newBenefit) continue
      totalBenefits++

      const msg = `🎂 ${bizName} wishes you a happy birthday! A special gift is waiting in your wallet.`
      logEntries.push({ user_id: profile.id, benefit_id: newBenefit.id, type: 'birthday', message: msg })

      if (profile.expo_push_token) {
        const prefs = (profile.notification_prefs ?? {}) as Record<string, boolean>
        if (prefs['birthday'] !== false) {
          messages.push({ to: profile.expo_push_token, title: '🎂 Happy Birthday!', body: msg, sound: 'default', data: { benefitId: newBenefit.id } })
          totalPushes++
        }
      }
    }
  }

  // Send pushes in chunks of 100
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
      logEntries.map((e) => ({ ...e, sent_at: new Date().toISOString() })),
    )
  }

  return new Response(
    JSON.stringify({ birthdayUsers: birthdayUsers.length, totalBenefits, totalPushes }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
