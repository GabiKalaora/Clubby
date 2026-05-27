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
| `stories` | Instagram-style promo stories (24 h TTL) | סטוריז פרסומיים בסגנון אינסטגרם |

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
**URL:** http://localhost:5174

- Email + password auth (sign-in or auto sign-up on first visit)
- Business registration form: name, category, description, address, phone
- On submit: inserts business row into Supabase with a `nanoid(12)` QR token
- QR code rendered via `qrcode` library encoding `clubby://enroll?token={token}`
- Download QR as PNG button
- "Register another business" flow

**Verified:** "Java House" created in DB with `qr_code_token=ghJd1JPLrquJ`, QR encodes `clubby://enroll?token=ghJd1JPLrquJ` ✓

### ✅ Slice 3 — QR Enrollment / רישום דרך QR
- `enroll-member` Edge Function: validates JWT, looks up business by `qr_code_token`, upserts membership, issues welcome benefit if an active promotion exists
- Deterministic UUID (SHA-1 via Web Crypto) ensures exactly-once benefit even on QR retry
- `increment_redemption_count` RPC (migration 002) tracks promotion usage
- `scan.tsx`: `expo-camera` QR scanner on native (dev build); manual token entry fallback on web
- Confirmation card: business logo, "You're in!" checkmark, welcome gift details, "View my wallet" CTA
- Idempotency verified: scanning the same QR twice produces exactly 1 membership row and 1 benefit row

פונקציית `enroll-member` Edge Function מאמתת JWT, מאתרת עסק לפי `qr_code_token`, יוצרת חברות ומנפיקה הטבת ברוכים הבאים אם קיים מבצע פעיל. UUID דטרמיניסטי מבטיח הטבה אחת גם בניסיון חוזר. מסך הסריקה כולל מצלמת QR בבנייה ייעודית ו-fallback להזנת טוקן ידנית.

**Verified:** Enrollment flow tested end-to-end — membership created, welcome benefit issued, confirmation card renders correctly ✓

### ✅ Slice 4 — Wallet Screen / מסך הארנק
- `useBenefits` hook: TanStack Query for fetching, `useRedeemBenefit` mutation with optimistic removal, `useAddBenefit` for manual entry
- `BenefitCard` component: business logo, title, value badge, expiry countdown (red ≤3d, amber ≤7d), "Manual" badge for unverified coupons, inline confirm strip (Cancel / Confirm) on redeem
- `wallet.tsx`: green balance card (sum of credit benefits), filter tabs (All / Balance / Discounts / Free Items), pull-to-refresh, empty state per tab
- `manual.tsx`: store name, title, type selector (Credit / Discount / Free item), value, optional expiry date → inserts with `verified: false, source: 'manual'`, auto-navigates back and invalidates query cache

מסך ארנק מלא: כרטיס יתרה ירוק, טאבים לסינון הטבות, כרטיסיות הטבה עם תג תוקף ותג "ידני", פדיון אופטימיסטי עם אישור inline, הזנת קופון ידנית.

**Verified:** Manual coupon added → appears with "Manual" badge → tab filtering works → redeem → optimistic removal + `redeemed_at` written to DB ✓

### ✅ Slice 5 — Discover + Store Profile / גילוי עסקים + פרופיל חנות
- `useBusinesses` hook: TanStack Query for businesses list (category + search filters), `useBusiness(id)` for profile, `useIsMember` for joined state, `useEnrollBusiness` mutation (calls `enroll-member` Edge Function with business `qr_code_token`)
- `discover.tsx`: search input (debounced 350ms), horizontal category pills (All/Food/Clothing/Shoes/Health/Tech/Service), business cards with active promo badge, `+` button enrolls directly (same edge function as QR scan)
- `store/[id].tsx`: store profile — logo, name, category, address, phone, About section, Current Offers, Opening Hours, "Join Club" / "✓ Joined" button
- Enrollment from Discover is idempotent (same SHA-1 deterministic UUID logic as QR flow)

גילוי עסקים: חיפוש עם דיבאונס, פילי קטגוריות, כרטיסי עסקים עם תג מבצע פעיל, כפתור `+` לרישום מידי. פרופיל חנות: לוגו, שם, כתובת, טלפון, תיאור, מבצעים פעילים, שעות פתיחה.

**Verified:** Category filter (Food → 1 result), search ("nike" → Nike Store only), `+` enroll → membership + benefit written to DB, store profile shows "✓ Joined", full opening hours rendered ✓

### ✅ Slice 6 — Push Notifications / התראות Push
- `_layout.tsx`: on native app launch → `requestPermissionsAsync()` → `getExpoPushTokenAsync()` → upserts `profiles.expo_push_token`; notification tap listener → navigates to wallet
- `send-expiry-reminders` Edge Function: queries benefits expiring within 7 days (not redeemed) joined with profiles for push token; sends batched messages to Expo Push API in chunks of 100; logs every attempt to `notification_log`
- `003_cron.sql` migration: enables `pg_cron` + `pg_net`; schedules function daily at 09:00 UTC via `net.http_post`
- Message format: "Your 10% discount at Nike Store expires in 2 days!" with title "⏰ Benefit expiring soon" (day-of: "⚠️ Benefit expires today!")

התראות Push: בעת פתיחת האפליקציה — בקשת הרשאה, שמירת טוקן Push בפרופיל. פונקציית Edge Function מוזמנת מדי יום ב-09:00 UTC דרך pg_cron — שולחת התראות לכל הלקוחות שהטבותיהם עומדות לפוג תוך 7 ימים ומתעדת ביומן.

**Verified:** Test benefit (expires in 2 days) + fake push token → function invoked → `{"sent":1,"pushErrors":0,"loggedEntries":1}` → `notification_log` row: "Your 10% discount at Nike Store expires in 2 days!" ✓

### ✅ Phase 2 — Full Business Portal / פורטל עסקי מלא**URL:** http://localhost:5174

A full-featured SPA for business owners, built with React + Vite + TypeScript. No framework router — pure state-based view switching.

#### Architecture
- `App.tsx` — auth state machine (loading → login → portal); auto sign-up on first visit
- `Portal.tsx` — fetches owner's businesses, manages selected business + active view, handles business creation
- `Sidebar.tsx` — dark sidebar with business selector dropdown, nav links, email + sign-out
- `pages/Dashboard.tsx` — stats grid via `get_business_stats` SECURITY DEFINER RPC
- `pages/Promotions.tsx` — full CRUD for promotions (create, toggle active/inactive)
- `pages/Members.tsx` — member list via `get_business_members` RPC + "Notify all" push blast
- `pages/QRPage.tsx` — renders QR code canvas for selected business, download as PNG

#### Key details
- Stats and member data use SECURITY DEFINER RPCs (`get_business_stats`, `get_business_members`) — owner's auth can't directly read other users' `profiles` rows due to RLS
- `notify-members` Edge Function verifies ownership, fetches push tokens via service role, sends to Expo Push API, logs to `notification_log`
- Promotions: credit amounts stored as cents (`benefit_value * 100`); discount stored as integer percent
- Multi-business support: selector dropdown switches context; "+ Add business" re-shows `BusinessForm`
- `BusinessForm.onCreated` updated to pass `id` (via `.select('id').single()` after insert) and accepts optional `onCancel`

**Verified:** Login → create business → Dashboard (stats) → Promotions (create 20% discount, active badge) → Members (empty state) → QR Code (canvas rendered, download button) ✓

---

#### פורטל עסקי מלא

ממשק SPA מלא לבעלי עסקים, בנוי עם React + Vite + TypeScript. ניתוב מבוסס state ללא framework router.

- **Dashboard:** רשת סטטיסטיקות (חברים, מבצעים פעילים, הטבות שהונפקו, שיעור פדיון) דרך RPC מאובטח
- **Promotions:** יצירה ועריכה של מבצעים (הנחה / קרדיט / פריט חינמי), הפעלה/כיבוי
- **Members:** רשימת חברים עם שם, טלפון ותאריך הצטרפות + שליחת הודעת Push לכל החברים
- **QR Code:** הצגת קוד QR לעסק הנבחר עם אפשרות הורדה כ-PNG
- נתוני חברים נקראים דרך SECURITY DEFINER RPC (RLS מונע קריאה ישירה של `profiles` של משתמשים אחרים)

---

### ✅ Notifications Screen / מסך התראות

- `005_notification_read.sql` — adds `read_at TIMESTAMPTZ` to `notification_log` + partial index for fast unread-count queries
- `useNotifications` hook: fetches user's notifications newest-first; `useUnreadCount` for badge; `useMarkAllRead` mutation
- `notifications.tsx`: All / Unread tabs; grouped by **Today / Yesterday / Earlier**; type icon (⏰ expiry, 🎁 promotion, 📣 message); relative time label ("2h ago"); green dot on unread rows; tap navigates to wallet when `benefit_id` present; mark-all-read fires on screen mount
- `wallet.tsx`: 🔔 bell button in header with red badge showing unread count (capped at "9+")

מסך התראות: טאבים All/Unread, קיבוץ לפי Today/Yesterday/Earlier, אייקון לפי סוג, זמן יחסי, נקודה ירוקה להודעות שלא נקראו. בפתיחת המסך כל ההודעות מסומנות כנקראו. כפתור 🔔 בארנק עם תג אדום למספר ההודעות שלא נקראו.

**Verified:** Bell badge shows "2" → tap → notifications screen loads → "Today" group with ⏰ renders correctly → returning to wallet clears badge ✓

---

### ✅ Stories / סטוריז (Instagram-style)

- `006_stories.sql` — `stories` table (image_url, caption, cta_text, cta_url, expires_at 24 h default); public `story-images` storage bucket; RLS: public read for non-expired, owner-only write
- `packages/shared/types/database.ts` — regenerated to include `stories` table
- **Portal — `pages/Stories.tsx`**: create form (image URL, caption, CTA text/URL, expires-in-hours); list split into Active / Expired sections with thumbnail, caption, CTA, expiry time, and ✕ delete button
- **Portal — Sidebar**: 📖 Stories nav item added between Members and QR Code
- **Mobile — `hooks/useStories.ts`**: `useActiveStories(userId)` — fetches stories from businesses the user is a member of, filtered to `expires_at > now()`
- **Mobile — `app/story/[id].tsx`**: full-screen viewer — background image, dark overlay, auto-progress bar per story (5 s), tap left/right for prev/next, X to close, business logo + name in header, caption + CTA button at bottom
- **Mobile — `wallet.tsx`**: horizontal story circles row above the balance card (shown only when active stories exist); each circle shows business logo + name, taps into the full-screen viewer

סטוריז בסגנון אינסטגרם: בעלי עסקים מפרסמים סטוריז מהפורטל (כתובת תמונה, כיתוב, כפתור CTA, תוקף שעות). לקוחות רואים עיגולי לוגו מעל כרטיס היתרה בארנק — לחיצה פותחת מציג מסך מלא עם סרגל התקדמות, ניווט בהקשה ועיצוב גרדיאנט.

**Verified:** Story created in portal → "Active (1)" card with image thumbnail, caption, CTA, expiry rendered correctly → DB row confirmed in `stories` table ✓

### ✅ Profile Screen / מסך פרופיל

- `hooks/useProfile.ts`: `useProfile(userId)` — TanStack Query fetching `profiles` row; `useUpdateProfile` mutation — updates `display_name`, invalidates cache
- `app/profile.tsx`: avatar circle shows initials derived from `display_name` (up to 2 words) or first char of phone; tap name to enter edit mode — pre-filled `TextInput`, Save + Cancel; InfoRow components for Phone and Email (read-only); Sign Out with `Alert` confirmation → `supabase.auth.signOut()` → redirect to sign-in
- `wallet.tsx`: 👤 button in header navigates to `/profile`

מסך פרופיל: עיגול אינישלס גדול בצבע הברנד, לחיצה על השם פותחת מצב עריכה עם שמירה ישירה ל-DB. שורות קריאה בלבד לטלפון ולמייל. כפתור התנתקות עם אישור התראה.

**Verified:** 👤 button → profile screen → tap name → edit TextInput opens pre-filled → save → initials update to "DC" + name shows "Dana Cohen" ✓

---

### ✅ Business Settings & Logo Upload / הגדרות עסק והעלאת לוגו

- `007_business_logos.sql` — creates `business-logos` public Storage bucket; RLS policies: public read, owner-only insert/update/delete keyed by `{businessId}/logo.{ext}` path
- `Portal.tsx` — `Business` type extended with `logo_url: string | null`; select query updated to fetch it
- **Portal — `pages/Settings.tsx`**: logo upload section (click circle → file input → `supabase.storage.upload()` with upsert → public URL saved to state); URL paste fallback; business details edit (name, description, address, phone); "Save changes" writes all fields to `businesses` table via `supabase.from('businesses').update()`; `onUpdated` callback propagates changes to Portal state (sidebar selector + all pages)
- **Portal — Sidebar**: ⚙️ Settings nav item added between Stories and QR Code

הגדרות עסק: העלאת לוגו בלחיצה על עיגול התצוגה המקדימה → שמירה ב-Supabase Storage ב-bucket ציבורי. חלופה: הדבקת URL תמונה. עריכת פרטי עסק (שם, תיאור, כתובת, טלפון) עם שמירה ישירה ל-DB. שינויים מתפשטים לכל הדפים (דשבורד, בקלפי הטבות, עיגולי סטוריז).

**Verified:** Settings page renders with logo preview circle → paste URL → img renders in circle → Save → DB confirms `logo_url` written ✓

---

### ✅ Web QR Enrollment / רישום דרך QR ברשת

- **`app/enroll.tsx`** — standalone route at `/enroll?token=XXXX`; checks auth session on mount; if not signed in saves token to `sessionStorage` and shows "Join the Club" prompt → sign-in CTA; if signed in calls `enroll-member` Edge Function directly and shows confirmation card
- **`sessionStorage` helpers** (`savePendingToken` / `consumePendingToken`) — survive auth redirect within the same browser tab; consumed on first read to prevent double-enrollment
- **`verify.tsx`** — after OTP success checks for pending token before routing; redirects to `/enroll?token=...` if present
- **`register.tsx`** — same pending token check after new-user registration completes; enrollment is the next step for brand-new users who scan a QR first
- **`QRPage.tsx`** — QR now encodes `${VITE_APP_URL}/enroll?token=...` (HTTP URL); iPhone camera opens Safari directly — no native app build required
- **`.env.local` (mobile)** — `EXPO_PUBLIC_SUPABASE_URL` set to LAN IP `10.0.0.34:54321` so phone browser can reach local Supabase
- **`.env.local` (portal)** — `VITE_APP_URL=http://10.0.0.34:8081` so QR encodes the LAN-accessible Expo web server

**E2E test flow:** Open portal on Mac → QR Code page → scan with iPhone camera → Safari opens enrollment page → sign in with phone OTP → benefit issued → confirmation card shown ✓

---

רישום דרך QR ברשת (ללא build ייעודי): קוד ה-QR שנוצר בפורטל מקודד כעת כתובת HTTP לאפליקציית ה-Expo Web. מצלמת האייפון פותחת Safari ישירות לדף `/enroll?token=...`. אם המשתמש אינו מחובר — הטוקן נשמר ב-`sessionStorage` ומחכה עד לסיום תהליך הזדהות/הרשמה. לאחר אימות OTP או רישום חדש — המשתמש מועבר אוטומטית לדף האישור עם כרטיס הטבת הברוכים הבאים.

---

## Key Design Decisions / החלטות עיצוב מרכזיות
- **Auth (portal):** Email + password — natural for business owners / אימות בדוא"ל
- **QR format:** HTTP URL `http://{LAN_IP}:8081/enroll?token={nanoid}` — iPhone camera opens Safari, no native build needed

- **Benefit amounts:** `amount_cents` is always integer — never float / תמיד מספר שלם
- **Idempotent enrollment:** `uuid_generate_v5` deterministic UUID prevents duplicate benefits on retry
- **RLS gate:** No UI slice built until its RLS policies pass SQL tests

---

## Local Dev Notes / הערות לפיתוח מקומי

- Mobile OTP code (local): **000000**
- Portal auth: email + password (auto sign-up on first visit)
- Supabase Studio: http://127.0.0.1:54323
- Portal: http://localhost:5174
- Mobile Metro bundler: http://localhost:8081
