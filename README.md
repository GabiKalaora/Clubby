# Clubby

> Cross-platform retail wallet app — customers collect memberships, coupons, and expiring benefits; business owners manage promotions and customer clubs via QR codes.

> אפליקציית ארנק קמעוני חוצת-פלטפורמות — לקוחות אוספים חברויות, קופונים והטבות; בעלי עסקים מנהלים מבצעים ומועדוני לקוחות באמצעות קודי QR.

---

## Architecture / ארכיטקטורה

| Layer | Tech |
|---|---|
| Mobile (customer) | React Native + Expo SDK 56, Expo Router |
| Web Portal (business owner) | React + Vite + TypeScript |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Shared types | `packages/shared` (npm workspace) |
| Styling (mobile) | NativeWind v4 (Tailwind CSS for RN) |
| Data fetching | TanStack Query v5 |
| Push notifications | Expo Push + FCM/APNs |

---

## Monorepo Structure / מבנה המונורפו

```
Clubby/
├── apps/
│   ├── mobile/          # Expo React Native — customer app
│   └── portal/          # Vite React — business owner portal
├── packages/
│   └── shared/          # Shared TypeScript types
│       └── types/
│           ├── database.ts    # Auto-generated from Supabase schema
│           ├── benefit.ts     # Benefit union type (credit/discount/free_item)
│           └── business.ts    # Business + OpeningHours types
└── supabase/
    ├── migrations/       # DB schema migrations
    ├── functions/        # Edge functions
    └── tests/            # RLS policy SQL tests
```

---

## Development Setup / הגדרת סביבת פיתוח

### Prerequisites / דרישות מוקדמות
- Node.js 20+
- Docker Desktop (for Supabase local)
- Supabase CLI
- Expo CLI (`npm install -g expo-cli`)

### Install / התקנה
```bash
npm install
```

### Start Supabase locally / הפעלת Supabase מקומית
```bash
supabase start       # starts local DB + Auth + Studio
supabase db reset    # applies migrations + seeds
```

Supabase Studio (local): http://127.0.0.1:54323

### Run mobile app / הפעלת אפליקציית מובייל
```bash
cd apps/mobile
npx expo start --clear
```
Open in Expo Go or run `npx expo run:ios` / `npx expo run:android` for a dev build.

> **Note:** QR scanning (Slice 3) requires a dev build — it does not work in Expo Go.

> **הערה:** סריקת QR (פרק 3) דורשת dev build — לא עובד ב-Expo Go.

### Run business portal / הפעלת פורטל בעלי עסקים
```bash
cd apps/portal
npm run dev          # http://localhost:5173
```

---

## Database Schema / סכמת מסד הנתונים

| Table | Description | תיאור |
|---|---|---|
| `profiles` | Customer profiles extending auth.users | פרופיל לקוח |
| `businesses` | Registered businesses with QR tokens | עסקים רשומים עם טוקן QR |
| `memberships` | Customer ↔ Business club membership | חברות לקוח במועדון עסק |
| `benefits` | Coupons, credits, free items per customer | הטבות: קופונים, קרדיטים, פריטים חינמיים |
| `promotions` | Promotions created by business owners | מבצעים שנוצרו על ידי בעלי עסקים |
| `notification_log` | Push notification audit log | יומן התראות Push |

RLS policies are fully tested in `supabase/tests/rls.test.sql`.

---

## Development Progress / התקדמות פיתוח

### ✅ Slice 0 — Foundation / בסיס
- Monorepo with npm workspaces (`apps/mobile`, `apps/portal`, `packages/shared`)
- Supabase schema: all 6 tables with indexes + RLS policies
- All RLS policies verified via SQL tests (`supabase/tests/rls.test.sql`)
- Shared TypeScript types: `Benefit` union type, `OpeningHours`, auto-generated DB types
- NativeWind v4 configured (babel + metro + tailwind config)
- Deep linking scheme `clubby://` registered in `app.json`

### ✅ Slice 1 — Customer Auth / אימות לקוח
- Sign-in screen: phone number input → `supabase.auth.signInWithOtp`
- OTP verification screen: 6-digit code → session established
- Registration screen: first + last name → profile upsert
- Auth guard in root layout: redirects unauthenticated users to sign-in
- Local dev: OTP code is always `000000` (no SMS provider needed)
- Local dev code: OTP = **000000**

### ✅ Slice 2 — Business Owner Portal / פורטל בעלי עסקים
**URL:** http://localhost:5173

- Email + password auth (sign-in or auto sign-up on first visit)
- Business registration form: name, category, description, address, phone
- On submit: inserts business row into Supabase with a `nanoid(12)` QR token
- QR code rendered via `qrcode` library encoding `clubby://enroll?token={token}`
- Download QR as PNG button
- "Register another business" flow

**Verified:** "Java House" created in DB with `qr_code_token=ghJd1JPLrquJ`, QR encodes `clubby://enroll?token=ghJd1JPLrquJ` ✓

### 🔄 Slice 3 — QR Enrollment / רישום דרך QR *(next)*
- Camera view using `react-native-vision-camera`
- QR detection → parse `clubby://enroll?token=...` → POST to Edge Function `enroll-member`
- Edge Function: upsert membership + optional welcome benefit
- Requires dev build (not Expo Go)

### ⏳ Slice 4 — Wallet Screen / מסך הארנק
- Benefit list with tabs: All / Balance / Credits / Discounts
- "Enter Coupon Manually" flow
- Swipe-to-redeem with TanStack Query optimistic updates

### ⏳ Slice 5 — Discover + Store Profile / גילוי עסקים + פרופיל חנות
- Category pills, business cards, search
- Store profile: cover, offers, working hours

### ⏳ Slice 6 — Push Notifications / התראות Push
- Expo push token stored on profiles
- Daily expiry-reminder Edge Function (pg_cron scheduled)

---

## Key Design Decisions / החלטות עיצוב מרכזיות

- **Auth (mobile):** Phone OTP — no email needed for customers / אימות טלפוני
- **Auth (portal):** Email + password — natural for business owners / אימות בדוא"ל
- **QR format:** `clubby://enroll?token={nanoid}` — deep link handled by Expo Router
- **Benefit amounts:** `amount_cents` is always integer — never float / תמיד מספר שלם
- **Idempotent enrollment:** `uuid_generate_v5` deterministic UUID prevents duplicate benefits on retry
- **RLS gate:** No UI slice built until its RLS policies pass SQL tests

---

## Local Dev Notes / הערות לפיתוח מקומי

- Mobile OTP code (local): **000000**
- Portal auth: email + password (auto sign-up on first visit)
- Supabase Studio: http://127.0.0.1:54323
- Portal: http://localhost:5173
- Mobile Metro bundler: http://localhost:8081
