# Clubby — פלטפורמת נאמנות קמעונאית

> **EN** — Cross-platform retail loyalty platform. Customers collect memberships, stamp cards, points and benefits. Business owners manage their club via QR codes. Anchor clients (retail chains) get cross-platform analytics.

> **HE** — פלטפורמת נאמנות קמעונאית. לקוחות אוספים חברויות, כרטיסיות חותמות, נקודות והטבות. בעלי עסקים מנהלים את המועדון באמצעות קודי QR. לקוחות עוגן (רשתות קמעונאות) מקבלים אנליטיקה מצרפית.

---

## Architecture / ארכיטקטורה

| Layer | Tech |
|---|---|
| Mobile (customer) | React Native + Expo SDK 56, Expo Router v4 |
| Web Portal (business owner) | React + Vite + TypeScript |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime) |
| Shared types | `packages/shared` (npm workspace) |
| Styling (mobile) | NativeWind v4 (Tailwind CSS for RN) |
| i18n | i18next + react-i18next (EN + HE, full RTL) |
| Data fetching | TanStack Query v5 |
| Push notifications | Expo Push + FCM/APNs (multi-device) |
| Charts (portal) | Recharts |

---

## Monorepo Structure / מבנה המונורפו

```
Clubby/
├── apps/
│   ├── mobile/                   # Expo React Native — customer app
│   │   ├── app/
│   │   │   ├── (auth)/           # sign-in, verify, register, onboarding
│   │   │   ├── (tabs)/           # wallet, scan, discover
│   │   │   ├── history.tsx
│   │   │   ├── notifications.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── redeem/[id].tsx   # verifiable redemption screen
│   │   │   └── store/[id].tsx    # store profile
│   │   ├── components/
│   │   │   └── BenefitCard.tsx
│   │   ├── hooks/
│   │   │   ├── useBenefits.ts
│   │   │   ├── useBusinesses.ts  # + useNearbyBusinesses (GPS/Haversine)
│   │   │   ├── useFeedPosts.ts
│   │   │   ├── useMemberships.ts
│   │   │   ├── useNotifications.ts
│   │   │   ├── usePoints.ts
│   │   │   ├── useProfile.ts
│   │   │   ├── useStampCards.ts
│   │   │   ├── useStories.ts
│   │   │   └── useTiers.ts
│   │   └── locales/              # en.json + he.json
│   └── portal/                   # Vite React — business owner portal
│       └── src/pages/
│           ├── AnchorDashboard.tsx  # platform-wide stats (anchor client)
│           ├── Dashboard.tsx
│           ├── FeedPosts.tsx
│           ├── Members.tsx
│           ├── Points.tsx
│           ├── Promotions.tsx
│           ├── QRPage.tsx           # multi-location QR
│           ├── Settings.tsx
│           ├── StampCards.tsx
│           ├── Stories.tsx
│           └── Tiers.tsx
├── packages/
│   └── shared/                   # Shared TypeScript types
├── scripts/
│   ├── make_full_deck_he_v2.py   # generates slides/Clubby_Full_HE_v2.pptx
│   └── take_demo_screenshots.py  # takes screenshots/demo/*.png
├── slides/
│   └── Clubby_Full_HE_v2.pptx   # 26-slide Hebrew pitch deck
├── screenshots/
│   └── demo/                     # 14 Hebrew demo screenshots
└── supabase/
    ├── migrations/               # 19 DB migrations
    ├── functions/
    │   ├── enroll-member/
    │   ├── notify-members/
    │   ├── re-engage-lapsed/
    │   ├── send-birthday-rewards/
    │   └── send-expiry-reminders/
    └── tests/
        └── rls.test.sql
```

---

## Development Setup / הגדרת סביבת פיתוח

### Prerequisites
- Node.js 20+
- Docker Desktop (for Supabase local)
- Supabase CLI
- Python 3.9+ (for screenshot/deck scripts)

### Install
```bash
npm install
```

### Start Supabase
```bash
supabase start       # starts local DB + Auth + Studio
supabase db reset    # applies all 19 migrations + seeds demo data
```

| Service | URL |
|---|---|
| Supabase Studio | http://127.0.0.1:54323 |
| Supabase API | http://127.0.0.1:54321 |
| PostgreSQL | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

### Run mobile app
```bash
cd apps/mobile
npx expo start --web    # web preview → http://localhost:8081
```

### Run business portal
```bash
cd apps/portal
npm run dev             # http://localhost:5174
```

### Local dev credentials
| | |
|---|---|
| Customer phone | `+972501111111` (Alice) |
| Customer OTP | `000000` |
| Portal email | `owner@test.com` / `ownerpass123` |
| Demo businesses | פיצה רומא, שכונתי — מרקט פרש |

---

## Database Schema / סכמת מסד הנתונים

### Core tables

| Table | Description |
|---|---|
| `profiles` | Customer profiles — display_name, phone, avatar_url, date_of_birth, notification_prefs, expo_push_token |
| `businesses` | Registered businesses — name, category, logo_url, cover_url, address, lat, lng, opening_hours (JSONB), qr_code_token, webhook_url |
| `memberships` | Customer ↔ Business — joined_at, active, referred_by, **total_stamps** |
| `benefits` | All customer benefits — type (credit/discount/free_item), source, redeemed, expires_at |
| `promotions` | Owner-defined promotions — benefit_type, benefit_value, max_redemptions, valid_from/until |
| `notification_log` | Push notification audit log |

### Loyalty mechanic tables

| Table | Description |
|---|---|
| `stamp_cards` | Stamp card definitions per business — required_stamps, reward_type, reward_title |
| `stamp_records` | Per-user stamp progress — current_stamps, completed_at |
| `tiers` | Tier definitions per business — name, min_stamps, color (Bronze/Silver/Gold or custom) |
| `points_programs` | Points program per business — name, points_per_qr, active |
| `points_balances` | Per-user balance per program |
| `points_rewards` | Redeemable rewards — name, points_cost, reward_type |

### Platform tables

| Table | Description |
|---|---|
| `business_locations` | Additional QR locations per business (multi-location) |
| `push_tokens` | Multi-device push tokens — user_id, token, platform, last_seen |
| `feed_posts` | WhatsApp-style posts from businesses — type, title, body, image_url, cta_text, expires_at |
| `stories` | Instagram-style stories — image_url, caption, cta_url, expires_at |

### Key enums
- `benefits.type`: `'credit' | 'discount' | 'free_item'`
- `benefits.source`: `'qr_scan' | 'manual' | 'promotion' | 'store_owner' | 'stamp_card' | 'birthday' | 'referral'`
- `feed_posts.type`: `'promotion' | 'announcement' | 'story' | 'offer'`

---

## Features / פיצ׳רים

### Customer Mobile App

| Feature | Status |
|---|---|
| Phone OTP auth (no password) | ✅ |
| Onboarding flow (4 screens) | ✅ |
| Wallet — balance, My Clubs, stamp cards, points, feed | ✅ |
| WhatsApp-style feed posts from joined businesses | ✅ |
| QR enrollment → welcome benefit (if store configured one) | ✅ |
| Discover — GPS-sorted (Haversine), "Open Now", search, category filter | ✅ |
| Store profile — cover photo, logo, promotions, hours, stamp progress, tier | ✅ |
| Stamp cards with progress tracking + auto-reward on completion | ✅ |
| Points balance per business | ✅ |
| Tier badges (Bronze / Silver / Gold) on club cards | ✅ |
| Verifiable redemption — HMAC 6-digit code (60s rotating) | ✅ |
| Benefit history + 4 savings metrics | ✅ |
| Notifications — expiry, birthday, re-engagement, direct push | ✅ |
| Per-type notification opt-out toggles | ✅ |
| Referral — share link, referrer earns 10% discount | ✅ |
| Avatar upload | ✅ |
| Profile — name, DOB, avatar, language, dark mode | ✅ |
| Dark mode (auto / light / dark) | ✅ |
| Full Hebrew + RTL (i18next, language toggle in settings) | ✅ |
| Stories (Instagram-style per business) | ✅ |

### Business Owner Portal

| Feature | Status |
|---|---|
| Dashboard — 4 stat cards + 30-day charts + CSV export | ✅ |
| Promotions — CRUD, credit/discount/free item | ✅ |
| Stamp Cards — define cards, stamp members, view progress | ✅ |
| Tiers — define Bronze/Silver/Gold thresholds | ✅ |
| Points — define program, earn rate, redeemable rewards | ✅ |
| Feed Posts — create/edit/pause/delete WhatsApp-style posts | ✅ |
| Stories — Instagram-style promo stories | ✅ |
| Members — list, detail modal, redeem from portal, CSV export | ✅ |
| Segmented push — all / new / active / lapsed cohorts | ✅ |
| QR Code — display + download + multi-location QR | ✅ |
| Settings — logo, cover photo, hours (7-day grid), webhook | ✅ |
| Webhook integration — signed POST on enrollment events | ✅ |
| Platform View (anchor client) — cross-business stats + top 10 | ✅ |
| Dark mode + Hebrew/English toggle | ✅ |

### Backend / Edge Functions

| Function | Trigger | Description |
|---|---|---|
| `enroll-member` | QR scan | Upsert membership, issue welcome benefit, call webhook, handle referral |
| `notify-members` | Owner action | Segmented push (all/new/active/lapsed), fans out to all push_tokens |
| `send-expiry-reminders` | Daily cron 09:00 | Push to users with benefits expiring ≤7 days |
| `send-birthday-rewards` | Daily cron 08:00 | Issue free item + push for today's birthdays |
| `re-engage-lapsed` | Daily cron 09:00 | Push to members with no activity in 30+ days |

---

## RPC Reference

| RPC | Description |
|---|---|
| `get_business_stats(p_business_id)` | Dashboard stat cards |
| `get_business_members(p_business_id)` | Member list |
| `get_member_benefits(p_business_id, p_user_id)` | Member detail |
| `get_member_growth(p_business_id)` | 30-day member growth series |
| `get_redemption_trend(p_business_id)` | 30-day redemption series |
| `get_stamp_cards(p_business_id, p_user_id)` | Stamp cards + user progress |
| `get_stamp_progress(p_stamp_card_id)` | All member progress for a card |
| `record_stamp(p_business_id, p_user_id, p_stamp_card_id)` | Add stamp; auto-completes + issues reward |
| `get_benefits_export(p_business_id)` | All benefits with user info (CSV export) |
| `get_platform_stats()` | Anchor: total businesses, members, benefits, redemption rate |
| `get_platform_growth()` | Anchor: 30-day cross-platform growth series |
| `get_top_businesses(p_limit)` | Anchor: top N businesses by member count |

---

## Key Design Decisions

- **Idempotent enrollment**: deterministic UUID prevents duplicate benefits on QR retry
- **Verifiable redemption**: `HMAC-SHA256(benefitId + timeWindow, userId)` — cashier verifies offline
- **Notification prefs**: JSONB sparse map; absence of key = opted in
- **Multi-device push**: `push_tokens` table fans out to all active devices per user
- **Referral idempotency**: deterministic UUID per (referrer, new user, business) triple
- **Stamp completion**: `record_stamp` RPC is atomic
- **GPS sorting**: Haversine formula client-side; businesses without coordinates sort to bottom
- **Feed RLS**: `feed_posts` filtered to active + non-expired + only from joined businesses
- **Benefit amounts**: `amount_cents` always integer — never float
- **RLS gate**: no UI built until its RLS policies pass `supabase/tests/rls.test.sql`

---

## Folder Reference

```
slides/                   → pitch deck (PowerPoint)
screenshots/demo/         → 14 Hebrew demo screenshots
scripts/
  make_full_deck_he_v2.py → regenerate slides/Clubby_Full_HE_v2.pptx
  take_demo_screenshots.py→ retake all demo screenshots
```

---

## Next Steps / שלבים הבאים

| Step | Notes |
|---|---|
| Production deploy | Supabase Cloud + Vercel — see `DEMO_GUIDE.md` for local demo setup |
| App Store + Play Store | EAS Build (`eas build --platform all --profile production`) |
| POS integration | Webhook API for purchase events from cashier systems |
| AI analytics | Smart campaign recommendations based on member behavior |
