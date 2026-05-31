# Clubby

> Cross-platform retail loyalty app — customers collect memberships, stamp cards, and benefits; business owners manage their club, promotions, and members via QR codes.

> אפליקציית נאמנות קמעונאית — לקוחות אוספים חברויות, כרטיסיות חותמות והטבות; בעלי עסקים מנהלים את המועדון, המבצעים והחברים באמצעות קודי QR.

---

## Architecture / ארכיטקטורה

| Layer | Tech |
|---|---|
| Mobile (customer) | React Native + Expo SDK 56, Expo Router v4 |
| Web Portal (business owner) | React + Vite + TypeScript |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Shared types | `packages/shared` (npm workspace) |
| Styling (mobile) | NativeWind v4 (Tailwind CSS for RN) |
| Data fetching | TanStack Query v5 |
| Push notifications | Expo Push + FCM/APNs |
| Charts (portal) | Recharts |

---

## Monorepo Structure / מבנה המונורפו

```
Clubby/
├── apps/
│   ├── mobile/                  # Expo React Native — customer app
│   │   ├── app/                 # Expo Router file-based navigation
│   │   │   ├── (auth)/          # sign-in, verify, register
│   │   │   ├── (tabs)/          # wallet, scan, discover
│   │   │   ├── history.tsx      # full benefit history
│   │   │   ├── notifications.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── redeem/[id].tsx  # verifiable redemption screen
│   │   │   └── store/[id].tsx   # store profile
│   │   ├── components/
│   │   │   └── BenefitCard.tsx
│   │   └── hooks/
│   │       ├── useBenefits.ts
│   │       ├── useBusinesses.ts
│   │       ├── useMemberships.ts
│   │       ├── useNotifications.ts
│   │       ├── useProfile.ts
│   │       ├── useStampCards.ts
│   │       └── useStories.ts
│   └── portal/                  # Vite React — business owner portal
│       └── src/pages/
│           ├── Dashboard.tsx    # stats + recharts
│           ├── Members.tsx      # list, detail modal, notify, CSV export
│           ├── Promotions.tsx   # full CRUD
│           ├── Settings.tsx     # logo, hours, webhook
│           ├── StampCards.tsx   # stamp card management
│           ├── Stories.tsx
│           ├── VerifyRedemption.tsx
│           └── QRPage.tsx
├── packages/
│   └── shared/                  # Shared TypeScript types
└── supabase/
    ├── migrations/              # 14 DB schema migrations
    ├── functions/               # Edge functions
    │   ├── enroll-member/       # QR enrollment + referral rewards
    │   ├── notify-members/      # segmented push notifications
    │   ├── re-engage-lapsed/    # lapsed member re-engagement cron
    │   ├── send-birthday-rewards/
    │   ├── send-expiry-reminders/
    │   └── stamp-record/        # (deprecated — handled by RPC)
    └── tests/
        └── rls.test.sql
```

---

## Development Setup / הגדרת סביבת פיתוח

### Prerequisites
- Node.js 20+
- Docker Desktop (for Supabase local)
- Supabase CLI
- Expo CLI (`npm install -g expo-cli`)

### Install
```bash
npm install
```

### Start Supabase locally
```bash
supabase start       # starts local DB + Auth + Studio
supabase db reset    # applies all 14 migrations
```

| Service | URL |
|---|---|
| Supabase Studio | http://127.0.0.1:54323 |
| Supabase API | http://127.0.0.1:54321 |
| PostgreSQL | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

### Run mobile app
```bash
cd apps/mobile
npx expo start --web    # web preview at http://localhost:8081
npx expo start          # native (Expo Go or dev build)
```

> QR scanning and push notifications require a dev build (`eas build --profile development`).

### Run business portal
```bash
cd apps/portal
npm run dev             # http://localhost:5174
```

### Local dev credentials
| | |
|---|---|
| Customer OTP | `000000` (any phone number) |
| Portal auth | email + password (auto sign-up) |
| Test phone | `+972501234567` |

---

## Database Schema / סכמת מסד הנתונים

| Table | Description |
|---|---|
| `profiles` | Customer profiles (extends auth.users) — display_name, phone, avatar_url, expo_push_token, date_of_birth, notification_prefs |
| `businesses` | Registered businesses — name, category, logo_url, address, opening_hours (JSONB), qr_code_token, webhook_url |
| `memberships` | Customer ↔ Business club membership — joined_at, active, referred_by |
| `benefits` | All customer benefits — type (credit/discount/free_item), source, redeemed, expires_at |
| `promotions` | Promotions created by owners — benefit_type, benefit_value, max_redemptions, active |
| `stamp_cards` | Stamp card definitions — required_stamps, reward_type, reward_title, active |
| `stamp_records` | Per-user stamp progress — current_stamps, completed, completed_at |
| `stories` | Instagram-style promo stories — image_url, caption, cta_url, expires_at (24h default) |
| `notification_log` | Push notification audit log — type, message, sent_at, read_at |

### Key types
- `benefits.type`: `'credit' \| 'discount' \| 'free_item'`
- `benefits.source`: `'qr_scan' \| 'manual' \| 'promotion' \| 'store_owner' \| 'stamp_card' \| 'birthday' \| 'referral'`
- `notification_log.type`: `'expiry_reminder' \| 'new_promotion' \| 'direct_message' \| 'birthday' \| 're_engagement'`
- `profiles.notification_prefs`: `{ expiry_reminder?, birthday?, re_engagement?, direct_message? }` — absence of key = opted in

RLS policies fully tested: `supabase/tests/rls.test.sql`

---

## Features / פיצ׳רים

### Customer Mobile App

| Feature | Description |
|---|---|
| Phone OTP auth | Sign in with any phone number; OTP = `000000` in local dev |
| Wallet | Balance card (credits), filter tabs (All/Balance/Discounts/Free Items), benefit cards with expiry countdown |
| Benefit history | Full chronological list of all benefits (active + redeemed) with total savings |
| QR enrollment | Scan business QR code → join club → welcome benefit issued instantly |
| Discover | Search + category filter (Food/Clothing/Shoes/Health/Tech/Service) + **Open Now** filter |
| Store profile | Logo, description, offers, opening hours, **"Invite friends"** referral share |
| Stamp cards | Progress ring / dot grid per card; auto-issues reward benefit on completion |
| Verifiable redemption | Full-screen HMAC 6-digit code (60s rotating); shows to cashier for verification |
| Notifications | Push notifications with per-type opt-out toggles in Profile |
| Notification history | Inbox with All/Unread tabs, grouped by day, tap-through to specific benefit |
| Birthday reward | Auto-issued free item on birthday across all clubs |
| Referral | Share link includes `ref=userId`; referrer gets 10% discount when friend joins |
| Profile | Edit name, date of birth, notification preferences (4 toggles) |
| Stories | Instagram-style story circles from businesses; full-screen viewer with auto-progress |

### Business Owner Portal

| Feature | Description |
|---|---|
| Dashboard | Stat cards (members, promotions, benefits issued, redemption rate) + line/bar charts (30-day) |
| Promotions | Create, edit, duplicate, delete, toggle active; credit/discount/free item types |
| Members | List with detail modal (full benefit history); **segmented push** (all/new/active/lapsed cohorts); **CSV export** |
| Stamp Cards | Create card definitions; stamp a customer (RPC `record_stamp`); view member progress |
| Verify Redemption | Enter 6-digit code → HMAC validation → mark redeemed → show member name + benefit |
| Stories | Create/delete Instagram-style promo stories with CTA button |
| Settings | Logo upload, business info, **opening hours editor** (7-day grid), webhook integration |
| QR Code | Display + download PNG; encodes enrollment URL |
| Analytics | Member growth line chart + daily redemptions bar chart (last 30 days) |
| Multi-business | Switch context between owned businesses |

### Backend / Edge Functions

| Function | Trigger | Description |
|---|---|---|
| `enroll-member` | On QR scan | Upsert membership, issue welcome benefit, call store webhook, handle referral reward |
| `notify-members` | Owner action | Segmented push by cohort (all/new/active/lapsed) |
| `send-expiry-reminders` | Daily cron 09:00 UTC | Push to users with benefits expiring ≤7 days |
| `send-birthday-rewards` | Daily cron 08:00 UTC | Issue free item + push for today's birthdays |
| `re-engage-lapsed` | Daily cron 09:00 UTC | Push to members with no activity in 30+ days |

All push-sending functions respect `profiles.notification_prefs` opt-outs.

---

## API / RPC Reference

| RPC | Description |
|---|---|
| `get_business_stats(p_business_id)` | Dashboard stat cards |
| `get_business_members(p_business_id)` | Member list for portal |
| `get_member_benefits(p_business_id, p_user_id)` | Member detail modal |
| `get_member_growth(p_business_id)` | 30-day member growth time series |
| `get_redemption_trend(p_business_id)` | 30-day daily redemption time series |
| `get_stamp_cards(p_business_id, p_user_id)` | Stamp cards with user progress |
| `get_stamp_progress(p_stamp_card_id)` | All member progress for a card |
| `record_stamp(p_business_id, p_user_id, p_stamp_card_id)` | Add stamp; auto-complete + issue reward |
| `increment_redemption_count(promo_id)` | Increment promo usage counter |

---

## Key Design Decisions

- **Idempotent enrollment**: deterministic UUID (`SHA-1` via Web Crypto) prevents duplicate benefits on QR retry
- **Verifiable redemption**: `HMAC-SHA256(benefitId + timeWindow, userId)` — cashier verifies without network call
- **Notification prefs**: stored as JSONB sparse map; absence of key = opted in (minimal storage)
- **Referral idempotency**: `deterministicUuid(referrerId + newUserId + businessId + 'referral')` — referrer can't earn twice for same friend
- **Stamp completion**: `record_stamp` RPC is atomic — increments, checks threshold, issues benefit in one transaction
- **RLS gate**: no UI built until its Supabase RLS policies pass SQL tests in `rls.test.sql`
- **Benefit amounts**: `amount_cents` always integer — never float

---

## Local Dev Notes

- Mobile OTP (local): **`000000`**
- Portal auth: email + password (auto sign-up on first visit)
- Supabase Studio: http://127.0.0.1:54323
- Portal: http://localhost:5174
- Mobile (web): http://localhost:8081
- Test phone: `+972501234567`
- Test portal: `owner@test.com`
