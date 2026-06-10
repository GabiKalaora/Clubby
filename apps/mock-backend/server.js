'use strict'
const express = require('express')
const cors    = require('cors')
const crypto  = require('crypto')
const fs      = require('fs')
const path    = require('path')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT           = process.env.PORT                    || 3001
const SUPABASE_URL   = process.env.SUPABASE_URL            || 'http://127.0.0.1:54321'
// M2M integration secret — never expose service role key to external backends
const INTEGRATION_KEY = process.env.CLUBBY_INTEGRATION_KEY || 'osher-ad-integration-key-2026'
// Inbound webhook secret (Clubby → us, for QR scan events)
const WEBHOOK_SECRET  = process.env.CLUBBY_WEBHOOK_SECRET  || 'osher-ad-demo-secret-2026'
const BUSINESS_ID     = 'd3d3dae5-7fa7-4a07-8fd8-f2d5c94cb562'

// ─── Persistence (JSON files) ─────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const TX_FILE      = path.join(DATA_DIR, 'transactions.json')
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json')
const EVENTS_FILE  = path.join(DATA_DIR, 'events.json')

const MEMBER_SEED = {
  '+972521000001': { id:'M-1001', name:'Dana Levi',      name_he:'דנה לוי',      tier:'gold',   points:2840, spent_ytd:5680,  birthday_month:6,  joined:'2023-03-10' },
  '+972521000002': { id:'M-1002', name:'Yossi Cohen',    name_he:'יוסי כהן',     tier:'silver', points:1420, spent_ytd:2840,  birthday_month:9,  joined:'2023-07-22' },
  '+972521000003': { id:'M-1003', name:'Maya Mizrahi',   name_he:'מאיה מזרחי',   tier:'silver', points:960,  spent_ytd:1920,  birthday_month:3,  joined:'2024-01-05' },
  '+972521000004': { id:'M-1004', name:'Oren Ben-David', name_he:'אורן בן-דוד',  tier:'bronze', points:320,  spent_ytd:640,   birthday_month:11, joined:'2024-08-14' },
  '+972521000005': { id:'M-1005', name:'Tamar Katz',     name_he:'תמר כץ',       tier:'bronze', points:180,  spent_ytd:360,   birthday_month:2,  joined:'2025-02-28' },
}

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

let MEMBERS      = loadJSON(MEMBERS_FILE, MEMBER_SEED)
let TRANSACTIONS = loadJSON(TX_FILE,      [])
let EVENTS       = loadJSON(EVENTS_FILE,  [])

// Idempotency map: transaction_id → result (persisted inside TRANSACTIONS)
const processedIds = new Set(TRANSACTIONS.filter(t => t.id).map(t => t.id))

let txCounter = 1000 + TRANSACTIONS.length

function saveMasters() {
  saveJSON(MEMBERS_FILE, MEMBERS)
  saveJSON(TX_FILE,      TRANSACTIONS)
  saveJSON(EVENTS_FILE,  EVENTS)
}

// ─── Event Log ────────────────────────────────────────────────────────────────
function logEvent(type, data) {
  const ev = { id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type, data, ts: new Date().toISOString() }
  EVENTS.unshift(ev)
  if (EVENTS.length > 500) EVENTS.pop()
  saveJSON(EVENTS_FILE, EVENTS)
  console.log(`[event] ${type}:`, JSON.stringify(data).slice(0, 120))
}

// ─── Products ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { code:'7290000066474', name:'חלב תנובה 3% שקית 1L',   name_en:'Tnuva Milk 3% 1L',       price:5.90,  category:'dairy'     },
  { code:'7290006396703', name:'לחם אחיד פרוס 750g',      name_en:'Sliced White Bread 750g', price:6.50,  category:'bakery'    },
  { code:'7290105912092', name:'שמן זית כתית 750ml',      name_en:'Olive Oil Extra V. 750ml',price:24.90, category:'oils'      },
  { code:'7290010696080', name:'עגבניות שרי 500g',         name_en:'Cherry Tomatoes 500g',   price:9.90,  category:'produce'   },
  { code:'7290014832917', name:'קוטג׳ 5% 250g',           name_en:'Cottage Cheese 5% 250g', price:7.20,  category:'dairy'     },
  { code:'7290002540304', name:'ביצים L ×12',             name_en:'Eggs L ×12',             price:19.90, category:'eggs'      },
  { code:'7290003571071', name:'קמח לבן 1kg',             name_en:'White Flour 1kg',        price:4.50,  category:'dry'       },
  { code:'7290010533986', name:'טונה בשמן זית 160g',      name_en:'Tuna in Olive Oil 160g', price:8.90,  category:'canned'    },
  { code:'7290000616582', name:'פסטה ספגטי 500g',         name_en:'Spaghetti Pasta 500g',   price:5.20,  category:'dry'       },
  { code:'7290011161839', name:'אורז בסמטי 1kg',          name_en:'Basmati Rice 1kg',       price:14.90, category:'dry'       },
  { code:'7290008613489', name:'שוקולד מילקה 100g',       name_en:'Milka Chocolate 100g',   price:8.50,  category:'snacks'    },
  { code:'7290002070031', name:'מיץ תפוזים טבעי 1L',     name_en:'Orange Juice Natural 1L',price:12.90, category:'beverages' },
  { code:'7290006468600', name:'יוגורט פרי 150g',         name_en:'Fruit Yogurt 150g',      price:3.90,  category:'dairy'     },
  { code:'7290003096443', name:'חומוס מוכן 400g',         name_en:'Ready Hummus 400g',      price:7.90,  category:'deli'      },
  { code:'7290004167018', name:'שמפו פנטן 400ml',         name_en:'Pantene Shampoo 400ml',  price:22.90, category:'health'    },
]

// Simulated branch data for Anchor Dashboard
const BRANCHES = [
  { id:'BR-01', name:'בני ברק — ז׳בוטינסקי', revenue:48200, members:312 },
  { id:'BR-02', name:'תל אביב — שדרות רוטשילד', revenue:61500, members:428 },
  { id:'BR-03', name:'ירושלים — קניון הדר', revenue:39800, members:255 },
  { id:'BR-04', name:'חיפה — קניון לב המפרץ', revenue:32100, members:198 },
  { id:'BR-05', name:'אשדוד — גרנד קניון', revenue:27900, members:163 },
]

// ─── Tier constants ───────────────────────────────────────────────────────────
const TIER_MULTIPLIER = { gold:2, silver:1.5, bronze:1 }
const TIER_DISCOUNT   = { gold:20, silver:15, bronze:10 }
const TIER_LABEL_HE   = { gold:'🥇 זהב', silver:'🥈 כסף', bronze:'🥉 ארד' }
const TIER_BADGE      = { gold:'🥇', silver:'🥈', bronze:'🥉' }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizePhone(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (s.startsWith('05') && s.length === 10) return '+972' + s.slice(1)
  if (s.startsWith('972') && !s.startsWith('+')) return '+' + s
  return s
}

function currentMonth() { return new Date().getMonth() + 1 }

function decideBenefit(member, totalIls) {
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
  if (member.birthday_month === currentMonth()) {
    return {
      benefit: { type:'free_item', title:`🎂 מתנת יום הולדת — ${member.name_he}!`, free_item_description:'מוצר אחד עד ₪15 חינם בקנייה הבאה', expires_at:expiresAt },
      message: `יום הולדת שמח ${member.name_he}! קיבלת מתנה מאושר עד 🎁`,
    }
  }
  if (totalIls >= 200) {
    const cents = member.tier === 'gold' ? 3000 : member.tier === 'silver' ? 2000 : 1000
    return {
      benefit: { type:'credit', title:`₪${cents/100} קרדיט נאמנות — אושר עד`, amount_cents:cents, expires_at:expiresAt },
      message: `קנייה גדולה! ₪${cents/100} נזכו לארנק Clubby שלך 🎉`,
    }
  }
  const pct = TIER_DISCOUNT[member.tier]
  return {
    benefit: { type:'discount', title:`${pct}% הנחת חבר ${TIER_LABEL_HE[member.tier]} — אושר עד`, discount_percent:pct, expires_at:expiresAt },
    message: `תודה ${member.name_he}! הנחת ${pct}% נוספה לאפליקציית Clubby שלך`,
  }
}

// Non-blocking: fire and log, never block purchase response
function issueClubbiyBenefit(phone, benefit, message, txId) {
  fetch(`${SUPABASE_URL}/functions/v1/issue-benefit`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${INTEGRATION_KEY}` },
    body: JSON.stringify({ user_phone:phone, benefit:{ ...benefit, business_id:BUSINESS_ID }, message }),
    signal: AbortSignal.timeout(8000),
  })
  .then(r => r.json().catch(() => ({})).then(body => {
    const ok = r.ok
    logEvent(ok ? 'benefit_issued' : 'benefit_error', {
      transaction_id:txId, phone,
      benefit_title: benefit.title,
      status: r.status,
      ...(ok ? {} : { error: body.error }),
    })
    // Update stored transaction with result
    const tx = TRANSACTIONS.find(t => t.id === txId)
    if (tx) { tx.clubby_result = { ok, status: r.status }; saveMasters() }
  }))
  .catch(err => {
    logEvent('benefit_error', { transaction_id:txId, phone, error:err.message })
  })
}

function verifyWebhookSig(rawBody, sig) {
  const exp = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
  try { return crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(sig)) } catch { return false }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Member lookup
app.get('/api/members', (req, res) => {
  const phone = normalizePhone(req.query.phone)
  if (!phone) return res.status(400).json({ error:'phone required' })
  const member = MEMBERS[phone]
  if (!member) return res.status(404).json({ error:'Member not found', phone })
  const recent = TRANSACTIONS.filter(t => t.phone === phone).slice(-5).reverse()
  res.json({ member:{ ...member, phone, tier_label_he:TIER_LABEL_HE[member.tier], tier_badge:TIER_BADGE[member.tier] }, recent_transactions:recent })
})

// Product catalogue
app.get('/api/products', (_req, res) => res.json(PRODUCTS))

// ── Purchase (idempotent) ─────────────────────────────────────────────────────
app.post('/api/purchase', (req, res) => {
  const { phone:rawPhone, items, payment_method='credit_card', installments=1, transaction_id } = req.body
  if (!rawPhone || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error:'phone and items[] required' })

  // Idempotency: return cached result for duplicate transaction_id
  if (transaction_id && processedIds.has(transaction_id)) {
    const cached = TRANSACTIONS.find(t => t.id === transaction_id)
    if (cached) {
      logEvent('purchase_duplicate', { transaction_id, phone:rawPhone })
      return res.json({ ...cached._response, idempotent:true })
    }
  }

  const phone = normalizePhone(rawPhone)
  const member = MEMBERS[phone]
  if (!member) return res.status(404).json({ error:'Member not found', phone })

  const productMap = Object.fromEntries(PRODUCTS.map(p => [p.code, p]))
  const lineItems = items.map(({ code, qty=1 }) => {
    const p = productMap[code]; if (!p) return null
    return { ...p, qty, line_total:Math.round(p.price * qty * 100) / 100 }
  }).filter(Boolean)
  if (lineItems.length === 0) return res.status(400).json({ error:'No valid items' })

  const subtotal    = Math.round(lineItems.reduce((s,i) => s+i.line_total, 0) * 100) / 100
  const vat         = Math.round(subtotal * 0.17 * 100) / 100
  const total       = Math.round((subtotal + vat) * 100) / 100
  const multiplier  = TIER_MULTIPLIER[member.tier]
  const pointsEarned = Math.floor(subtotal * multiplier)
  const txId        = transaction_id || `OA-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(++txCounter).padStart(6,'0')}`

  // Update member totals
  member.points    += pointsEarned
  member.spent_ytd += subtotal

  const { benefit, message } = decideBenefit(member, total)
  const receiptHe = [
    `קבלה — אושר עד`,
    `עסקה: ${txId}`,
    lineItems.map(i => `${i.name} ×${i.qty}  ₪${i.line_total.toFixed(2)}`).join('\n'),
    `סה"כ לפני מע"מ: ₪${subtotal.toFixed(2)}`,
    `מע"מ (17%): ₪${vat.toFixed(2)}`,
    `סה"כ לתשלום: ₪${total.toFixed(2)}`,
    payment_method === 'credit_card' ? `תשלום: כרטיס אשראי (${installments} תשלומים)` : `תשלום: ${payment_method}`,
    `נקודות שנצברו: ${pointsEarned} (×${multiplier})`,
    `סך נקודות: ${member.points.toLocaleString()}`,
  ].join('\n')

  const response = {
    transaction_id: txId,
    member_name: member.name, member_name_he: member.name_he,
    tier: member.tier, tier_label_he: TIER_LABEL_HE[member.tier], tier_badge: TIER_BADGE[member.tier],
    subtotal, vat, total,
    points_earned: pointsEarned, points_multiplier: multiplier, new_balance: member.points,
    clubby_benefit_issued: 'pending',
    clubby_benefit: benefit,
    clubby_message: message,
    receipt_he: receiptHe,
  }

  const tx = {
    id: txId, phone, member_id: member.id,
    timestamp: new Date().toISOString(),
    items: lineItems, subtotal, vat, total,
    payment_method, installments,
    points_earned: pointsEarned, points_after: member.points, tier: member.tier,
    _response: response,
  }
  TRANSACTIONS.push(tx)
  if (transaction_id) processedIds.add(transaction_id)
  saveMasters()

  logEvent('purchase', { transaction_id:txId, member:member.name, total, points_earned:pointsEarned })

  // Non-blocking benefit issuance — response returns immediately
  issueClubbiyBenefit(phone, benefit, message, txId)

  res.json(response)
})

// Transaction history
app.get('/api/members/:id/history', (req, res) => {
  const txs = TRANSACTIONS.filter(t => t.member_id === req.params.id).slice(-10).reverse()
  res.json({ member_id:req.params.id, transactions:txs })
})

// Store dashboard
app.get('/api/dashboard', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const todayTxs = TRANSACTIONS.filter(t => t.timestamp.startsWith(today))
  const revenue = todayTxs.reduce((s,t) => s+t.total, 0)
  const pointsIssued = todayTxs.reduce((s,t) => s+t.points_earned, 0)
  const memberSpend = {}
  TRANSACTIONS.forEach(t => { memberSpend[t.member_id] = (memberSpend[t.member_id]||0)+t.total })
  const topMembers = Object.entries(memberSpend).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([id,total]) => { const m = Object.values(MEMBERS).find(m=>m.id===id); return { id, name:m?.name||id, tier:m?.tier||'—', tier_badge:TIER_BADGE[m?.tier]||'', total_spent:Math.round(total*100)/100 } })
  res.json({
    store:{ id:'OSHER_AD_DEMO', name:'אושר עד — סניף הדגמה' },
    stats:{
      total_members: Object.keys(MEMBERS).length,
      transactions_today: todayTxs.length,
      revenue_today: Math.round(revenue*100)/100,
      points_issued_today: pointsIssued,
      active_members_today: new Set(todayTxs.map(t=>t.member_id)).size,
    },
    top_members: topMembers,
    recent_transactions: TRANSACTIONS.slice(-5).reverse(),
  })
})

// ── Anchor Dashboard ──────────────────────────────────────────────────────────
app.get('/api/anchor-dashboard', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const todayTxs = TRANSACTIONS.filter(t => t.timestamp.startsWith(today))
  const totalRevenue = TRANSACTIONS.reduce((s,t) => s+t.total, 0)
  const totalMembers = Object.values(BRANCHES).reduce((s,b) => s+b.members, 0)
    + Object.keys(MEMBERS).length
  const benefitsIssued = EVENTS.filter(e => e.type === 'benefit_issued').length
  // Category breakdown from products purchased
  const catSpend = {}
  TRANSACTIONS.forEach(tx => {
    tx.items.forEach(item => {
      catSpend[item.category] = (catSpend[item.category]||0) + item.line_total
    })
  })
  const topCategories = Object.entries(catSpend).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([cat,rev]) => ({ category:cat, revenue:Math.round(rev*100)/100 }))
  // 30-day simulated member growth
  const now = Date.now()
  const growth = Array.from({length:7}, (_,i) => {
    const d = new Date(now - (6-i) * 24 * 60 * 60 * 1000)
    const day = d.toLocaleDateString('he-IL', { month:'short', day:'numeric' })
    return { day, new_members: Math.floor(Math.random()*8 + 2) }
  })
  res.json({
    kpis:{
      total_members: totalMembers,
      revenue_total: Math.round(totalRevenue*100)/100,
      benefits_issued: benefitsIssued,
      active_today: new Set(todayTxs.map(t=>t.member_id)).size,
      branches: BRANCHES.length,
    },
    branches: BRANCHES,
    top_categories: topCategories,
    member_growth: growth,
    tier_breakdown:{
      gold:   Object.values(MEMBERS).filter(m=>m.tier==='gold').length,
      silver: Object.values(MEMBERS).filter(m=>m.tier==='silver').length,
      bronze: Object.values(MEMBERS).filter(m=>m.tier==='bronze').length,
    },
  })
})

// ── Integration events log ────────────────────────────────────────────────────
app.get('/api/events', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit||'50'), 200)
  res.json(EVENTS.slice(0, limit))
})

// ── Reset demo data ───────────────────────────────────────────────────────────
app.post('/api/reset', (_req, res) => {
  MEMBERS = JSON.parse(JSON.stringify(MEMBER_SEED))
  TRANSACTIONS.length = 0
  EVENTS.length = 0
  processedIds.clear()
  txCounter = 1000
  saveMasters()
  res.json({ ok:true, message:'Demo data reset to seed state' })
})

// ── Inbound webhook from Clubby (QR scan) ─────────────────────────────────────
app.post('/clubby/webhook', express.text({ type:'application/json' }), (req, res) => {
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  let payload
  try { payload = JSON.parse(rawBody) } catch { return res.status(400).json({ error:'Invalid JSON' }) }

  const sig = req.headers['x-clubby-signature']
  if (sig && !verifyWebhookSig(rawBody, sig)) {
    console.warn('[webhook] Invalid signature')
    return res.status(401).json({ error:'Invalid signature' })
  }

  logEvent('webhook_inbound', { user_id:payload.user_id, token:payload.token })

  // Map Clubby user to member (demo: use fixed mapping or first member)
  const member = Object.values(MEMBERS)[0]
  const pct = TIER_DISCOUNT[member.tier]
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const benefit = {
    type:'discount',
    title:`${pct}% הנחת חבר ${TIER_LABEL_HE[member.tier]} — אושר עד`,
    discount_percent:pct, expires_at:expiresAt,
  }
  const message = `ברוך הבא ${member.name_he}! הנחת ${pct}% נוספה לארנק שלך`

  logEvent('webhook_response', { member:member.name, benefit_title:benefit.title })
  res.json({ benefit, message })
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status:'ok', store:'Osher-Ad Mock Backend', version:'2.0.0',
    members: Object.keys(MEMBERS).length,
    products: PRODUCTS.length,
    transactions: TRANSACTIONS.length,
    events: EVENTS.length,
    integration_key: INTEGRATION_KEY !== 'osher-ad-integration-key-2026' ? 'custom' : 'demo-default',
    supabase_url: SUPABASE_URL,
    persistence: 'json-file',
  })
})

app.listen(PORT, () => {
  console.log(`\n🏪 Osher-Ad Mock Backend v2.0 — http://localhost:${PORT}`)
  console.log(`   Integration key: ${INTEGRATION_KEY !== 'osher-ad-integration-key-2026' ? '✅ custom' : '⚠️  demo default'}`)
  console.log(`   Transactions loaded: ${TRANSACTIONS.length}`)
  console.log(`   Members: ${Object.keys(MEMBERS).map(p=>MEMBERS[p].name).join(', ')}`)
})
