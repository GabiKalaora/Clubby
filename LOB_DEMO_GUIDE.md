# Clubby — LOB Demo Script

> **Before you start:** open these 3 tabs in your browser.
>
> | Tab | URL | What it is |
> |---|---|---|
> | Customer app | http://localhost:8081 | What end customers see on their phone |
> | Business portal | http://localhost:5173 | What the store owner manages |
> | (optional) Supabase | http://127.0.0.1:54323 | Live database — impressive for technical LOB |

---

## The Story You Tell

> *"A customer walks into your store. They scan a QR code. Instantly they're a loyalty member — no app download required, no registration form, no loyalty card to lose. Their wallet lives in their browser. Every benefit, stamp, and offer is in one place. You manage it all from a dashboard in real time."*

---

## Part 1 — Store Owner Side (5 min)

### 1.1 Dashboard
Open the **Portal** tab → sign in with `owner@test.com` / `portal1234`

Point out:
- **7 members**, **2 active promotions**, **20 benefits issued**, **40% redemption rate**
- Live charts: member growth + daily redemptions
- "This is what the owner sees the morning after running a promotion."

### 1.2 Member list
Click **Members** in the sidebar

Point out:
- Real customer names (Dana Levi, Yossi Cohen, Maya Mizrahi…) with join dates
- Click **View** on any member → show their personal benefit history, tier badge, and visit count
- "You know exactly who your best customers are."
- Show **Export CSV** — "One click to integrate with your existing CRM."
- Show **Notify members** — "Segmented push notifications — send to all, new, active, or lapsed members."

### 1.3 Promotions
Click **Promotions**

Point out:
- Two active promotions — **Active badge is green** ✓
- Click **⋯** on "25% Welcome Discount" → show Edit / Duplicate / Delete options
- "Duplicate a promotion with one click — dates are automatically cleared so you can't accidentally re-run an expired offer."

### 1.4 Loyalty tiers
Click **Tiers** (under LOYALTY in sidebar)

Point out:
- Bronze → Silver → Gold progression with stamp thresholds
- "Customers see their tier badge live in their wallet. No manual tracking."
- Click **+ Add tier** to show how easy it is to create a custom tier

### 1.5 Points program
Click **Points** (under LOYALTY)

Point out:
- "Coffee Points" — 10 pts per scan
- "Free Coffee" reward at 50 pts
- "You define the earn rate and the rewards. Completely configurable."

### 1.6 QR code
Click **QR Code**

Point out:
- The store's unique enrollment QR — print it, display it at checkout, or add to receipts
- Multiple location QR codes available for chain stores
- "This is all a customer needs to see to join your loyalty program."

---

## Part 2 — Customer Side (5 min)

> **Tip:** If demoing on a laptop, open http://localhost:8081 in a second browser window side-by-side with the portal.

### 2.1 Sign in as Dana (existing loyal customer)
Go to http://localhost:8081

- Enter phone: **+972521000001**
- Click **Continue** → enter OTP: **000000** → click **Verify**
- Lands on **Wallet**

### 2.2 Wallet — what Dana sees
Point out:
- **"Your Benefits"** card — shows count of active benefits (not a confusing ₪0 balance)
- **MY CLUBS** — בית קפה בדיקה with Bronze tier badge
- **UPDATES** feed — live offers from clubs she's joined
- Benefit cards: birthday gift + 25% discount with a gradient **"Use"** button
- Filter tabs: All / Balance / Discounts / Free Items — scrollable

### 2.3 Redeem a benefit (live)
Tap **"Use"** on the 25% Welcome Discount → redeem screen opens
- "Dana shows this screen to the cashier. One tap to confirm redemption."
- Go back. The benefit is now marked **Used** and greyed out.
- **Switch to the portal → Members → View Dana → show the redemption just appeared live.**
- "Real-time sync between the customer's wallet and your dashboard."

### 2.4 Discover — finding new clubs
Tap **Discover** (bottom right tab)

Point out:
- Business cards with category, promotion badge, and **Open in Maps** link
- **Map view** button — tap it → live OpenStreetMap with store pins
- **Near me** toggle — uses GPS to sort by distance
- **Open Now** toggle — filters by current opening hours
- Tap **פיצה רומא** → full store profile with offers, hours, address
- Tap **+** to enroll → green ✓ confirms enrollment instantly

### 2.5 Scan a new store QR
Tap the **QR button** (centre of tab bar)

- On web: shows manual token entry + camera
- Type token: `pizza-roma-qr` → tap **Join**
- Confirmation card appears: "Welcome to פיצה רומא Club! 🎉" + welcome benefit
- Tap **View Wallet** → new benefit appears immediately

### 2.6 Profile
Tap **👤** (top right of wallet)

Point out:
- Language toggle: tap **עברית** → entire app switches to Hebrew RTL instantly
- Switch back to English
- Theme: Auto / Light / Dark
- "White-label ready — language, theme, and branding are all configurable."

---

## Part 3 — Integration Story (2 min, for technical LOB)

> *"If you already have a POS system, you don't need to change anything."*

Explain:
- Store owner sets a **webhook URL** in Settings
- When a customer scans the store QR, Clubby sends a POST to their backend
- The backend returns what benefit to issue — tier-aware (Gold members get 20% off, Bronze get 10%)
- We have a **live mock of an Osher-Ad POS backend** that demonstrates this exact flow
- "Your engineers wire it in one afternoon."

---

## Part 4 — Surprise Finisher (1 min)

Switch app language to **עברית** (Profile → Language → עברית)

Walk through the wallet in Hebrew:
- "ההטבות שלך", "הטבות פעילות", "המועדונים שלי"
- RTL layout flips automatically — right-to-left, Hebrew text throughout
- "Full Hebrew support out of the box. No extra development needed."

Switch back to English before ending.

---

## Talking Points (keep in your back pocket)

| Question | Answer |
|---|---|
| "Does it need an app download?" | No — runs in the browser. Native app (iOS/Android) is ready for App Store when needed. |
| "What about my existing loyalty database?" | Webhook integration — your POS pushes events, we handle the wallet. |
| "How many customers can it handle?" | Supabase (PostgreSQL) scales to millions. RLS policies enforce data isolation per business. |
| "Can we brand it?" | Yes — logo, colors, and name are all configurable. |
| "Is it real-time?" | Yes — member redemptions appear in the portal dashboard the instant they happen. |
| "What does it cost?" | *(your commercial answer)* |

---

## Quick Cheat Sheet

| What | Value |
|---|---|
| Customer phone (Dana) | +972521000001 |
| OTP (local dev) | 000000 |
| Portal login | owner@test.com / portal1234 |
| Scan token (Pizza Roma) | pizza-roma-qr |
| Scan token (Coffee shop) | Olr2j-dMkjVN |
| Mobile app | http://localhost:8081 |
| Portal | http://localhost:5173 |
| Database (Supabase Studio) | http://127.0.0.1:54323 |
