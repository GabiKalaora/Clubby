# Clubby — Full Demo Walkthrough Guide
## Manual test: Store Owner + Customer (end-to-end)

> **Before you start:** Make sure all 3 services are running.
> Open 3 terminal tabs and run:
> ```
> Tab 1:  supabase start               (wait for "running")
> Tab 2:  cd apps/mobile && npx expo start --web --port 8081
> Tab 3:  cd apps/portal && npm run dev
> ```
> Then open in your browser:
> - Customer app: **http://localhost:8081**
> - Business portal: **http://localhost:5173**

---

## PART 1 — STORE OWNER

### Step 1 — Sign in to the Portal

1. Open **http://localhost:5173**
2. Enter email: `owner@test.com`
3. Enter password: `portal1234`
4. Click **Sign in / Create account**

**✅ Check:** You see the Dashboard with a dark purple sidebar, stat cards showing members + benefits, and two charts (purple line + pink bar).

---

### Step 2 — Dashboard stats

On the Dashboard you should see:
- **Total Members** — how many customers have joined
- **Active Promotions** — live welcome offers
- **Benefits Issued** — total benefits given out
- **Redemption Rate** — % of benefits actually used
- Two 30-day charts below

**✅ Check:** All 4 stat cards have numbers. Charts show some activity spikes.

---

### Step 3 — Promotions

1. Click **Promotions** in the left sidebar
2. You see "25% Welcome Discount" as Active (7 redemptions)
3. Click **+ New promotion**
4. Fill in:
   - Title: `Happy Hour — 30% off`
   - Benefit type: `Discount`
   - Discount %: `30`
5. Click **Create promotion**

**✅ Check:** The new promotion appears at the top of the list with 0 redemptions and Active badge.

---

### Step 4 — Members

1. Click **Members** in the sidebar
2. You see 7 members with name, phone, join date
3. Click **View** on any member (e.g. Dana Levi)
4. A modal opens showing their benefit history

**✅ Check:** Modal shows "25% Welcome Discount" benefit with Active status and a Redeem button.

5. Close the modal (✕)
6. Click **📣 Notify members** (top right)
7. Leave audience as "All members", type a message: `New happy hour deal — 30% off this weekend!`
8. Click **Send to 7 members**

**✅ Check:** Button fires without error (push sends to devices with tokens).

---

### Step 5 — Stamp Cards

1. Click **Stamp Cards** in the sidebar
2. You see existing stamp cards defined
3. Click **+ New stamp card**
4. Fill in:
   - Card name: `Coffee Loyalty`
   - Required stamps: `8`
   - Reward title: `Free coffee of your choice`
5. Click **Save**

**✅ Check:** New stamp card appears in the list.

---

### Step 6 — Feed Posts

1. Click **Feed Posts** in the sidebar
2. You see existing posts (Weekend deals, free muffin, etc.)
3. Click **+ New post**
4. Fill in:
   - Type: `Offer`
   - Title: `☕ Today only — buy 1 get 1 free!`
   - Body: `Show this message at the counter before 6pm.`
   - CTA text: `Claim now`
5. Click **Publish post**

**✅ Check:** Post appears at top of list as Active. This post will now appear in every member's wallet UPDATES feed.

---

### Step 7 — QR Code

1. Click **QR Code** in the sidebar
2. You see a black-and-white QR code
3. The enrollment link is shown below it (e.g. `clubby://enroll?token=Olr2j-dMkjVN`)

**✅ Check:** QR renders. Note down the token (you'll use it in the customer section).

---

### Step 8 — Platform Analytics

1. Click **🏢 Platform View** at the top of the sidebar
2. You see cross-business stats:
   - Total businesses on the platform
   - Total members
   - Redemption rate
   - 30-day growth charts
   - Top businesses table

**✅ Check:** Numbers load, charts render, table shows businesses ranked by members.

---

## PART 2 — CUSTOMER

### Step 9 — Sign in as a customer

1. Open **http://localhost:8081** in a new browser tab (or use your phone)
2. Enter phone: `+972521000001`
3. Click **Continue** — the gradient button activates
4. On the Verify screen, type: `000000`
5. Click **Verify**

**✅ Check:** You land on the Wallet screen. Pink→purple gradient balance card at top.

---

### Step 10 — Explore the Wallet

On the Wallet screen, verify each section:

| Section | What you should see |
|---|---|
| **Balance card** | Pink→purple gradient, "₪0.00 total balance", "View history →" |
| **MY CLUBS** | "בית קפה בדיקה" with Bronze tier badge and a "1" badge |
| **UPDATES** | The new "Today only — buy 1 get 1 free!" post you just published |
| **Benefits list** | "25% Welcome Discount" benefit card with gradient "Use" button |
| **Tab bar** | Wallet, Coupon (ticket), QR scan (gradient circle), Discover |

**✅ Check all 5 sections are present and visible.**

---

### Step 11 — Redeem a benefit

1. In the Wallet, find the "25% Welcome Discount" card
2. Tap the gradient **Use** button on the right
3. The Redeem screen opens:
   - Shows "25% off" in purple
   - Shows business name "בית קפה בדיקה"
   - Purple-tinted instruction box: "Show this to the cashier..."
   - Pink→purple gradient **Confirm redemption** button
4. Tap **Confirm redemption**

**✅ Check:** Animated gradient checkmark appears with "Redeemed!" message. Screen goes back to wallet after ~2.5 seconds. The benefit card in wallet now shows "Used" in grey.

---

### Step 12 — Discover screen

1. Tap the **Discover** tab (storefront icon, bottom right)
2. Verify you see:
   - `[ List ]  [ Map ]` toggle in the top-right header
   - `📍 Near me` pill button
   - Category squares: All (purple), Food, Clothing, Shoes, Health, Tech, Service
   - `● Open Now` filter pill
   - 4 business cards, each with promotion badge and **🗺 Open in Maps** link

3. **Test Search:** Type `פיצ` in the search bar
   - **✅ Check:** List filters to 2 pizza businesses instantly. Clear with ✕.

4. **Test Open Now:** Tap the **Open Now** pill
   - **✅ Check:** Pill turns purple, list filters to only currently-open businesses.

5. **Test Food category:** Tap the 🍔 Food square
   - **✅ Check:** Food square highlights, list shows only food businesses.

6. **Test Near me:** Tap the `📍 Near me` pill
   - **✅ Check:** Pill turns purple. If location permission granted, list sorts by distance with km badges.

---

### Step 13 — Map View

1. In Discover, tap the **Map** button (top-right toggle)
2. The screen switches to a real map

**✅ Check (web browser):**
- OpenStreetMap tiles load (Tel Aviv street map)
- Purple circle pins appear for businesses with coordinates (פיצה רומא, שכונתי, בית קפה בדיקה)
- Grey pin for already-joined business
- Bottom bar shows: "📍 3 stores with location · Tap a pin to see details"
- Tap any pin → popup shows business name, category, promotion

**✅ Check (real iOS/Android device):**
- Full native map with smooth panning/zooming
- Tap a pin → bottom card slides up with View + Join buttons

3. Tap **List** to go back to the list view

---

### Step 14 — Store Profile

1. In Discover (list view), tap the card for **פיצה רומא**
2. The Store Profile screen opens with:
   - Cover photo (dark purple hero at top)
   - Store logo + name + category
   - **Join Club** gradient button (or ✓✓ Joined if already a member)
   - Address and phone
   - **Current Offers** section with active promotions
   - **Opening Hours** table

3. If not yet a member, tap **Join Club**

**✅ Check:** Button changes to "✓✓ Joined" with grey background. An **Invite friends** purple outline button appears.

---

### Step 15 — Manual Coupon

1. Tap the **ticket icon** in the tab bar (between QR and Discover)
2. The "Add coupon manually" screen opens
3. Fill in:
   - Store name: `Super Pharm`
   - Coupon title: `10% member discount`
   - Tap **Discount** type (turns pink)
   - Discount %: `10`
4. Tap **Save coupon** (pink→purple gradient button)

**✅ Check:** Screen navigates back to wallet. The new "10% member discount" coupon appears in the benefits list with a "Manual" badge.

---

### Step 16 — Onboarding Flow

> *This is shown to new users after first registration. Test it directly:*

1. Navigate to: **http://localhost:8081/(auth)/onboarding**
2. Slide 1: "Discover local clubs" — tap **Next**
3. Slide 2: "Scan to join" — tap **Next**
4. Slide 3: "Earn rewards" — tap **Next**
5. Slide 4: "Rise through the tiers" — button changes to **Get started →**

**✅ Check:** Progress dots change on each slide. Last slide shows amber dot. Gradient button is pink→purple throughout.

---

### Step 17 — Hebrew Language

1. From the Wallet, tap the **👤 profile icon** (top right)
2. Scroll to **Language** section
3. Tap **עברית**
4. App restarts in Hebrew RTL layout

**✅ Check:**
- "ארנק" instead of "Wallet"
- "גלה" instead of "Discover"  
- All text right-aligned (RTL)
- Register screen shows "צור חשבון" / "שם פרטי" / "שם משפחה"

Switch back to English the same way.

---

### Step 18 — Back in the Portal: Verify activity

After the customer actions above, go back to the portal (**http://localhost:5173**):

1. Click **Dashboard** — Benefits Issued count increased, Redemption Rate updated
2. Click **Members** → click **View** on Dana Levi
   - Her benefit now shows **Redeemed** status with today's date
3. Click **Feed Posts** — the "buy 1 get 1 free" post you created shows as Active with 0 redemptions

**✅ Check:** All data reflects the customer actions in real time.

---

## Quick Credentials Reference

| Service | URL | Login |
|---|---|---|
| Customer app | http://localhost:8081 | Phone `+972521000001` / OTP `000000` |
| Business portal | http://localhost:5173 | `owner@test.com` / `portal1234` |
| POS demo (optional) | http://localhost:3001 | No login needed |

### Other test customers (all use OTP `000000`):

| Phone | Name | Tier |
|---|---|---|
| `+972521000001` | Dana Levi | 🥇 Gold |
| `+972521000002` | Yossi Cohen | 🥈 Silver |
| `+972521000003` | Maya Mizrahi | 🥈 Silver |
| `+972521000004` | Oren Ben-David | 🥉 Bronze |
| `+972521000005` | Tamar Katz | 🥉 Bronze |

---

## Full Checklist Summary

### Portal (Store Owner)
- [ ] Sign in with email/password
- [ ] Dashboard: 4 stat cards + 2 charts load
- [ ] Create a new promotion
- [ ] View member list + open detail modal
- [ ] Send push notification to all members
- [ ] Create a stamp card
- [ ] Publish a feed post
- [ ] View QR code
- [ ] Platform Analytics (cross-business view)

### Mobile App (Customer)
- [ ] Sign in with phone + OTP 000000
- [ ] Wallet: gradient hero, MY CLUBS, UPDATES feed, benefit cards
- [ ] Redeem a benefit → animated success → benefit marked Used
- [ ] Discover: list view, search, Open Now, category filter, Near me
- [ ] Discover: **Map view** → OpenStreetMap with purple pins
- [ ] Store profile: open from Discover, Join Club button
- [ ] Manual coupon: add a Discount type coupon
- [ ] Onboarding: 4 slides + Get started button
- [ ] Hebrew language toggle (RTL layout)

### Verify Portal Reflects Customer Actions
- [ ] Dashboard benefit count increased
- [ ] Member detail shows benefit as Redeemed
