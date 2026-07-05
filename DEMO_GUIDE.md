# Clubby — Complete Demo Guide
## How to create a store and act as a customer (step by step, zero assumed knowledge)

---

## What is Clubby?

Clubby is a loyalty platform with three parts running on your computer:

| Part | What it is | Where you open it |
|---|---|---|
| **Mobile app** | The customer's phone app (runs in your browser) | http://localhost:8081 |
| **Business portal** | The store owner's management dashboard | http://localhost:5173 |
| **Database** | Stores all the data (runs silently in the background) | http://127.0.0.1:54323 (admin view) |

Everything runs **locally on your computer** — no internet needed after setup.

---

## Prerequisites — Install these first

### 1. Node.js (JavaScript runtime)
1. Go to https://nodejs.org
2. Download the **LTS** version (the left green button)
3. Run the installer — click Next through all steps
4. Verify it worked: open Terminal (Mac) or Command Prompt (Windows) and type:
   ```bash
   node --version
   ```
   You should see something like `v20.x.x`

### 2. Docker Desktop (needed to run the database)
1. Go to https://www.docker.com/products/docker-desktop/
2. Download for your operating system (Mac or Windows)
3. Install and **launch Docker Desktop** — you must see the whale icon in your menu bar / system tray before continuing
4. Verify: in Terminal type:
   ```bash
   docker --version
   ```
   You should see `Docker version 24.x.x` or similar

### 3. Supabase CLI (database tool)
Open Terminal and run:
```bash
npm install -g supabase
```
Verify:
```bash
supabase --version
```
You should see `2.x.x`

---

## Step 1 — Get the project

If you already have the Clubby folder on your computer, skip to Step 2.

Open Terminal, navigate to where you want the project, then:
```bash
git clone https://github.com/GabiKalaora/Clubby.git
cd Clubby
```

---

## Step 2 — Install project dependencies

In Terminal, make sure you are inside the `Clubby` folder, then run:
```bash
npm install
```
This downloads all the code libraries the project needs. It takes 1–3 minutes.

---

## Step 3 — Start the database

**Make sure Docker Desktop is running first** (whale icon visible in menu bar).

Then in Terminal (from inside the `Clubby` folder):
```bash
supabase start
```

This starts the local database. First time takes 2–5 minutes (downloads images). Subsequent starts take ~30 seconds.

When it finishes you will see output like this:
```
API URL:    http://127.0.0.1:54321
Studio URL: http://127.0.0.1:54323
DB URL:     postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Now load the demo data (tables + seed data):
```bash
supabase db reset
```
This creates all the tables and inserts demo businesses and customers. Takes ~30 seconds. You should see `Finished supabase db reset.`

---

## Step 4 — Start the mobile app

Open a **new Terminal tab** (Cmd+T on Mac, or open a new Command Prompt window on Windows).

Navigate to the mobile app folder:
```bash
cd Clubby/apps/mobile
```

Start the app:
```bash
npx expo start --web --port 8081 --clear
```

Wait until you see:
```
Web is waiting on http://localhost:8081
```

Then open your browser and go to: **http://localhost:8081**

You should see the Clubby sign-in screen.

---

## Step 5 — Start the business portal

Open **another new Terminal tab**.

Navigate to the portal folder:
```bash
cd Clubby/apps/portal
```

Start it:
```bash
npm run dev
```

Wait until you see:
```
VITE ready in ... ms
➜  Local: http://localhost:5173/
```

Open your browser and go to: **http://localhost:5173**

You should see the "Business Portal — Welcome" sign-in screen.

---

## Step 6 — (Optional) Start the POS demo backend

This simulates a real supermarket chain (Osher-Ad) connecting their POS system to Clubby.

Open **another new Terminal tab**:
```bash
cd Clubby/apps/mock-backend
npm install
node server.js
```

Wait for:
```
🏪 Osher-Ad Mock Backend running on http://localhost:3001
```

Open: **http://localhost:3001**

You should see the dark Hebrew POS terminal UI.

---

## ✅ All services running check

Before continuing, confirm all three (or four) URLs work in your browser:

| URL | Should show |
|---|---|
| http://localhost:8081 | Clubby sign-in screen (light background, "Welcome") |
| http://localhost:5173 | Business Portal sign-in ("BUSINESS PORTAL") |
| http://127.0.0.1:54323 | Supabase Studio database admin |
| http://localhost:3001 | Osher-Ad POS terminal (optional) |

If any URL doesn't load, go to the Troubleshooting section at the bottom.

---

---

# PART 1 — STORE OWNER: Set Up Your Business

## 1.1 — Sign in to the Business Portal

1. Open **http://localhost:5173** in your browser
2. In the **Email** field type any email address — for example: `mystore@demo.com`
3. In the **Password** field type any password (minimum 6 characters) — for example: `demo123`
4. Click **Sign in / Create account**

> ℹ️ You do not need to register first. On first sign-in, the account is created automatically.

You will now see the **Dashboard** — it's empty because you haven't created a business yet.

---

## 1.2 — Create your business

A form should appear asking for your business details. If not, click **+ Add business** in the left sidebar.

Fill in:

| Field | What to enter | Example |
|---|---|---|
| **Business name** | Your store name | `Demo Coffee Shop` |
| **Category** | Type of business | `food` |
| **Description** | Short description | `Great coffee and pastries` |
| **Address** | Physical address | `123 Main St, Tel Aviv` |
| **Phone** | Contact number | `+972501234567` |

Click **Create** (or **Save**).

You will now see your store name appear in the dropdown at the top of the left sidebar, and your Dashboard will show 0 members, 0 promotions.

---

## 1.3 — Add a welcome promotion

A promotion is automatically issued as a benefit when a customer scans your QR code for the first time.

1. Click **Promotions** in the left sidebar
2. Click **+ New Promotion**
3. Fill in:

| Field | Value |
|---|---|
| **Title** | `Welcome — 25% off your first visit` |
| **Benefit type** | `Discount` |
| **Discount %** | `25` |
| **Active** | make sure this is toggled ON ✅ |

4. Click **Save**

You should now see the promotion listed with a green "Active" badge.

---

## 1.4 — Create a stamp card

A stamp card rewards customers who visit repeatedly. After a set number of stamps they get a free reward.

1. Click **Stamp Cards** in the left sidebar
2. Click **+ New Stamp Card**
3. Fill in:

| Field | Value |
|---|---|
| **Card name** | `Coffee Loyalty Card` |
| **Required stamps** | `8` |
| **Reward title** | `Free coffee of your choice` |

4. Click **Save**

---

## 1.5 — Set up loyalty tiers (Bronze / Silver / Gold)

Tiers give customers a status level based on how many stamps they've collected. Customers see their tier badge in the wallet.

1. Click **Tiers** in the left sidebar
2. Click **+ Add tier** — add three tiers:

**Tier 1:**
| Field | Value |
|---|---|
| Name | `Bronze` |
| Minimum stamps | `0` |
| Color | `#cd7f32` |

Click Save, then **+ Add tier** again.

**Tier 2:**
| Field | Value |
|---|---|
| Name | `Silver` |
| Minimum stamps | `10` |
| Color | `#94a3b8` |

Click Save, then **+ Add tier** again.

**Tier 3:**
| Field | Value |
|---|---|
| Name | `Gold` |
| Minimum stamps | `25` |
| Color | `#f59e0b` |

Click Save.

---

## 1.6 — Post a feed update (shown in customers' wallets)

Feed posts appear in the "UPDATES" section of every member's wallet in real time — like a WhatsApp broadcast to your club members.

1. Click **Feed Posts** in the left sidebar
2. Click **+ New post**
3. Fill in:

| Field | Value |
|---|---|
| **Post type** | `Offer` |
| **Title** | `🎉 Weekend Special — Free muffin with any drink!` |
| **Body text** | `Show this message Saturday & Sunday and get a free muffin with any beverage purchase.` |
| **CTA Button text** | `Claim free muffin` |
| **Expires on** | leave blank (no expiry) |

4. Click **Publish post**

The post is now live. Every member who opens their wallet will see it.

---

## 1.7 — Get your QR code (customers scan this to join)

1. Click **QR Code** in the left sidebar
2. You see a black-and-white QR code — this is your store's enrollment code
3. Click **Download** to save it as a PDF for printing, or take a screenshot

> 💡 For the web demo, you also need your **QR token** (a short string like `Olr2j-dMkjVN`). It appears below the QR code. Copy it — you'll use it in the customer section.

Your enrollment link looks like this:
```
http://localhost:8081/enroll?token=YOUR_TOKEN_HERE
```

---

## 1.8 — Configure Settings (optional: webhook for POS integration)

This step only applies if you started the Osher-Ad POS backend (Step 6 above).

1. Click **Settings** in the left sidebar
2. Scroll down to the **Custom Backend Integration** section
3. In **Webhook URL** enter: `http://localhost:3001/clubby/webhook`
4. Click **Generate** next to Signing Secret — a random secret is generated
5. Click **Save**

Now when a customer scans your QR code, the POS terminal is notified and can return a custom benefit based on the customer's membership tier.

---

---

# PART 2 — CUSTOMER: Sign Up, Join a Store, and Use Benefits

## 2.1 — Open the customer app

Open **http://localhost:8081** in your browser (or on a phone for a more realistic demo).

You see the **sign-in screen** — a light grey/white screen with the Clubby wordmark and a phone number field.

---

## 2.2 — Sign in as a customer

### Option A — Use a pre-loaded test customer (recommended for demo)

These customers already exist in the database with memberships and benefits:

| Phone number | Name | Tier | Already a member of |
|---|---|---|---|
| `+972521000001` | Dana Levi | 🥇 Gold | Demo Coffee, פיצה רומא |
| `+972521000002` | Yossi Cohen | 🥈 Silver | Demo Coffee |
| `+972521000003` | Maya Mizrahi | 🥈 Silver | Demo Coffee |
| `+972521000004` | Oren Ben-David | 🥉 Bronze | Demo Coffee |
| `+972521000005` | Tamar Katz | 🥉 Bronze | Demo Coffee |

**Steps:**
1. Type the phone number (e.g. `+972521000001`) in the phone field
2. Click **Continue** — the app recognizes the number
3. On the verify screen, type `000000` (the test OTP code)
4. Click **Verify**
5. You are taken directly to the **Wallet** screen

### Option B — Create a brand new customer

1. Type any new Israeli phone number e.g. `+972541000099`
2. Click **Continue** — you will see "Phone not found" error
3. This is correct! New customers must scan a QR code first to join a store
4. Go to Step 2.3 to join a store, then come back to sign in

---

## 2.3 — Join a store (as a new customer)

There are two ways to join a store:

### Method A — Open the enrollment link in your browser

1. Take the QR token from the portal (Step 1.7) — e.g. `Olr2j-dMkjVN`
2. Open this URL in your browser:
   ```
   http://localhost:8081/enroll?token=Olr2j-dMkjVN
   ```
   (replace `Olr2j-dMkjVN` with your actual token)
3. You see a "Join the Club" screen
4. If you're not signed in, tap **Sign in to join** → enter your phone → OTP `000000` → you're enrolled
5. The welcome benefit (25% discount) appears in your wallet immediately

### Method B — Use the Discover screen

1. Sign in first (Step 2.2)
2. Tap the **Discover** tab (store icon at the bottom right of the screen)
3. Find your store in the list — scroll down to see "Demo Coffee Shop"
4. Tap the purple **+** button on the right side of the store card
5. You are enrolled and the welcome benefit appears in your wallet

---

## 2.4 — Explore the Wallet

After signing in and joining a store, tap the **Wallet** tab (bottom left icon).

You will see:

**Balance card (top)** — a pink-to-purple gradient card showing:
- Your total credit balance in ₪
- "View history →" link to see all past benefits

**MY CLUBS section** — shows every store you've joined with:
- The store logo
- Your tier badge (Bronze / Silver / Gold)
- A number badge showing active benefits

**UPDATES section** — the feed posts your stores have published:
- The "Free muffin" post you created in Step 1.6 appears here
- Tap the CTA button to go to the store profile

**Benefits list** — below the feed, filtered by tabs:
- **All** — every benefit
- **Balance** — credit in ₪
- **Discounts** — percentage discounts
- **Free Items** — free item vouchers

---

## 2.5 — Redeem a benefit

1. In the Wallet screen, scroll down past the feed to see benefit cards
2. Find the "25% Welcome Discount" card (from your store)
3. Tap the gradient **Use** button on the right side of the card
4. The **Redeem screen** opens showing:
   - The benefit name and value
   - "Show this to the cashier, then tap Confirm to mark it as used"
5. Tap the pink-purple **Confirm redemption** button
6. You see an animated green checkmark — benefit is marked as used ✅
7. The screen automatically goes back to the wallet after 2.5 seconds

---

## 2.6 — Explore the Discover screen

1. Tap the **Discover** tab (bottom right)
2. You see:
   - **Category squares** — tap Food, Clothing, Shoes, etc. to filter
   - **Open Now** pill — shows only stores open right now (based on hours you set)
   - **Business cards** — each shows the store logo, name, category, distance, and active promotion
3. Tap any business card to open the full **Store Profile** showing:
   - Cover photo and logo
   - Join / Joined button
   - Business description, address, phone
   - Active promotions list
   - Opening hours

---

## 2.7 — Add a manual coupon

If you have a physical coupon or membership card from a store not on Clubby, you can add it manually.

1. Tap the **ticket icon** in the tab bar (center-right, between the QR scan button and Discover)
2. Fill in:

| Field | Value |
|---|---|
| **Store name** | `Super Pharm` |
| **Coupon title** | `10% member discount` |
| **Type** | Tap **Discount** to select it |
| **Discount (%)** | `10` |
| **Expiry date** | leave blank |

3. Tap **Save coupon**
4. The coupon appears in your wallet with a "Manual" badge (not verified by the store)

---

## 2.8 — Check your profile

1. Tap the **person icon** (top right of the wallet screen)
2. You see the profile screen showing:
   - Your name (tap to edit)
   - Phone number and email
   - Date of birth (used for birthday rewards)
   - Language setting (English / עברית)
   - Theme (Auto / Light / Dark)
   - Notification preferences
3. To **change language to Hebrew**: tap Language → tap עברית → the app restarts in Hebrew RTL layout

---

---

# PART 3 — POS INTEGRATION DEMO (Osher-Ad Mock Backend)

> Skip this section if you didn't start the POS backend in Step 6.

## 3.1 — Open the POS terminal

Go to **http://localhost:3001** — you see a dark Hebrew interface simulating an Osher-Ad supermarket POS terminal.

The top navigation has 5 tabs:
- **קופה** — the main checkout screen
- **דשבורד** — store analytics
- **לוג** — live integration events
- **עוגן** — anchor/chain dashboard
- **API** — documentation

---

## 3.2 — Look up a customer

1. Click one of the quick-select buttons below the phone input:
   - **דנה 🥇** → loads Dana Levi (Gold tier, 2,840 points)
   - **יוסי 🥈** → loads Yossi Cohen (Silver tier)
   - **מאיה** → loads Maya Mizrahi
   - **אורן** → loads Oren Ben-David
   - **תמר** → loads Tamar Katz
2. You see the member card showing: name, Hebrew name, tier badge, points balance, annual spend

---

## 3.3 — Build a basket of products

Click on product tiles in the catalogue (right side):
- Each click adds the item to the basket on the left
- Click **+** / **−** buttons in the basket to change quantity
- The running total shows: subtotal, VAT (17%), and total in ₪

Select payment method:
- **אשראי** — credit card
- **מזומן** — cash
- **Apple Pay** — Apple Pay

For credit card, choose installments: 1 / 3 / 6 / 12 תשלומים

---

## 3.4 — Process the sale

1. Make sure a member is looked up (step 3.2)
2. Make sure you have items in the basket (step 3.3)
3. Click the green **בצע מכירה** button

You will see:
- A Hebrew receipt in the basket panel showing all items, VAT, and total
- Points earned: based on tier multiplier (Gold = ×2, Silver = ×1.5, Bronze = ×1)
- If the purchase is ≥ ₪200 or it is the customer's birthday month → a green banner: **"הטבה נשלחה ל-Clubby! 🎉"**
- The benefit appears in the customer's Clubby wallet in real time (check http://localhost:8081)

---

## 3.5 — Watch the Integration Log

Click the **🔌 לוג** tab.

You see a live feed of every interaction between the POS and Clubby:

| Icon | Event type | What it means |
|---|---|---|
| 🛒 | `purchase` | A sale was processed |
| ⚠️ | `purchase_duplicate` | Same transaction_id sent twice — idempotency prevented double points |
| 🎁 | `benefit_issued` | Clubby successfully issued a benefit to the customer's wallet |
| ❌ | `benefit_error` | Clubby was unreachable (Supabase down?) |
| ← | `webhook_inbound` | A customer scanned your QR code — Clubby called the POS |
| → | `webhook_response` | POS returned a tier-appropriate benefit to Clubby |

The log refreshes automatically every 5 seconds.

---

## 3.6 — View the Anchor Dashboard

Click the **עוגן** tab.

This simulates the view that a large retail chain (like Osher-Ad) would see across all their branches:
- Total members, transactions, revenue today
- Tier breakdown (Gold / Silver / Bronze)
- Top buyers table
- "Powered by Clubby" branding

---

---

# PART 4 — BACK IN THE PORTAL: Review What Happened

## 4.1 — See the new member

1. Go to **http://localhost:5173** (you should still be signed in)
2. Click **Members** in the left sidebar
3. You see a table of all members who joined your store, with:
   - Name, phone number, join date
   - **View** button on the right
4. Click **View** on any member → a panel opens showing:
   - All their benefits (title, type, value, issued date, redeemed yes/no)
   - Total credit they've received

---

## 4.2 — Check the updated dashboard

1. Click **Dashboard** in the left sidebar
2. The four stat cards at the top now show updated numbers:
   - **Total Members** — how many people have joined
   - **Active Promotions** — your promotions that are currently on
   - **Benefits Issued** — total benefits given out
   - **Redemption Rate** — % of benefits that were actually used
3. The two charts below show the last 30 days of activity:
   - Left chart: new members per day
   - Right chart: redemptions per day

---

## 4.3 — Send a push notification to all members

1. Click **Members** in the left sidebar
2. Click the green **Notify members** button (top right)
3. A panel opens:

| Field | Value |
|---|---|
| **Audience** | `All members` (or choose New / Active / Lapsed) |
| **Message** | `☕ This weekend only — buy 2 get 1 free!` |

4. Click **Send to N members**
5. All members with a device token receive a push notification

---

## 4.4 — View Platform Analytics (anchor client view)

1. Click **Platform View** at the very top of the left sidebar
2. This shows cross-business analytics — the view a large retail chain would use to monitor all their locations:
   - Total businesses, members, and benefits across the entire platform
   - 30-day growth charts (new users + new memberships)
   - Top businesses by member count with redemption rates

---

---

## Quick Reference Card

### All URLs

| Service | URL |
|---|---|
| Customer mobile app | http://localhost:8081 |
| Business portal | http://localhost:5173 |
| POS demo (Osher-Ad) | http://localhost:3001 |
| Supabase database admin | http://127.0.0.1:54323 |

### All login credentials

| Service | Username / Email | Password / OTP |
|---|---|---|
| Business portal (any new owner) | any@email.com | any password (min 6 chars) |
| Business portal (pre-loaded owner) | `owner@test.com` | `portal1234` |
| Mobile app (all test customers) | see phone numbers below | `000000` |

### Test customer phone numbers

| Phone | Name | Tier | Pre-enrolled in |
|---|---|---|---|
| `+972521000001` | Dana Levi | 🥇 Gold | Multiple stores |
| `+972521000002` | Yossi Cohen | 🥈 Silver | Demo Coffee |
| `+972521000003` | Maya Mizrahi | 🥈 Silver | Demo Coffee |
| `+972521000004` | Oren Ben-David | 🥉 Bronze | Demo Coffee |
| `+972521000005` | Tamar Katz | 🥉 Bronze | Demo Coffee |
| `+972501111111` | Alice Customer | — | פיצה רומא |
| `+972501234567` | (new) | — | none — needs QR scan |

### QR tokens for pre-loaded stores

| Store | QR Token | Enrollment URL |
|---|---|---|
| בית קפה בדיקה | `Olr2j-dMkjVN` | http://localhost:8081/enroll?token=Olr2j-dMkjVN |
| פיצה רומא | `pizza-roma-qr` | http://localhost:8081/enroll?token=pizza-roma-qr |
| שכונתי — מרקט פרש | `shchunatí-qr` | http://localhost:8081/enroll?token=shchunatí-qr |

---

## Troubleshooting

| Problem | Likely cause | How to fix |
|---|---|---|
| `supabase start` fails or hangs | Docker Desktop not running | Open Docker Desktop and wait for the whale icon to appear in the menu bar, then retry |
| http://localhost:8081 doesn't load | Expo not started | Run `cd apps/mobile && npx expo start --web --port 8081 --clear` |
| http://localhost:5173 doesn't load | Portal not started | Run `cd apps/portal && npm run dev` |
| "Phone not found" error on sign-in | New phone number not in database | Use one of the test numbers above, or enroll via /enroll link first |
| Portal dashboard is empty / spinner | Still loading | Wait 3–5 seconds and refresh the page |
| Benefit not appearing in wallet | Customer not enrolled in that store | Check that the customer joined the store (Members list in portal) |
| POS shows "service key not set" | Backend started without env var | Stop and restart: `SUPABASE_SERVICE_KEY=<key> node server.js` |
| Expo bundle shows old design | Cached bundle | Stop expo and restart with `--clear` flag |
| Port already in use error | Previous process still running | Run `supabase stop` then `supabase start` |
| `npm install` fails | Network issue or Node version | Check Node version is 18+ (`node --version`), try `npm install --legacy-peer-deps` |

### How to get the Supabase service role key

You need this to start the POS backend with full functionality:

```bash
supabase status
```

Look for the line that says `service_role key:` — copy the long string that follows.

Then start the POS backend as:
```bash
cd apps/mock-backend
SUPABASE_SERVICE_KEY="eyJhbGci...your-key-here" node server.js
```

### How to reset all data to a clean state

If something gets corrupted or you want to start fresh:

```bash
supabase db reset
```

**Warning:** this deletes all data and reloads the original demo data. Any stores or customers you created will be gone.

---

## Stopping everything when done

```bash
supabase stop
```

This shuts down the database. The Expo and Portal servers stop automatically when you close their Terminal tabs.
