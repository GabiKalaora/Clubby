-- ═══════════════════════════════════════════════════════════════════════════
-- Clubby — local demo seed
-- Loaded automatically by `supabase db reset` (config.toml → [db.seed]).
-- Safe to re-run: every statement is idempotent (ON CONFLICT DO NOTHING).
--
-- Creates:
--   • 2 business owners (email + password → portal login)
--   • 5 businesses across categories, with real Tel Aviv-area coordinates
--   • 2 customers (phone + test OTP → mobile login)
--   • memberships, feed posts, stories, promotions, stamp cards, wallet benefits
--
-- Login credentials
--   Portal   owner@test.com / ownerpass123   (also owner2@test.com / ownerpass123)
--   Mobile   +972501111111  (Alice)  OTP 000000
--            +972501234567  (Bob)    OTP 000000
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Fixed UUIDs ───────────────────────────────────────────────────────────
--   owners  1xxxxxxx…    customers  2xxxxxxx…    businesses  b0000000…0N
--   feed    f00…         stories    50c…         promos  d00…  benefits be0…

-- ═══ 1. AUTH USERS ═════════════════════════════════════════════════════════

-- Owners (email/password). gotrue needs the *_token columns to be '' not NULL.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'owner@test.com', crypt('ownerpass123', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'owner2@test.com', crypt('ownerpass123', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '{"sub":"10000000-0000-0000-0000-000000000001","email":"owner@test.com"}', 'email', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   '{"sub":"10000000-0000-0000-0000-000000000002","email":"owner2@test.com"}', 'email', now(), now(), now())
ON CONFLICT (provider_id, provider) DO NOTHING;

-- Customers (phone). enable_confirmations=false, but set phone_confirmed_at anyway.
INSERT INTO auth.users (
  instance_id, id, aud, role, phone, phone_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', '972501111111', now(),
   now(), now(), '{"provider":"phone","providers":["phone"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', '972501234567', now(),
   now(), now(), '{"provider":"phone","providers":["phone"]}', '{}', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '{"sub":"20000000-0000-0000-0000-000000000001","phone":"972501111111"}', 'phone', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   '{"sub":"20000000-0000-0000-0000-000000000002","phone":"972501234567"}', 'phone', now(), now(), now())
ON CONFLICT (provider_id, provider) DO NOTHING;

-- The on_auth_user_created trigger already inserted profiles rows; fill in details.
UPDATE public.profiles SET display_name = 'Alice Cohen',  date_of_birth = '1994-06-15'
  WHERE id = '20000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET display_name = 'Bob Levi',     date_of_birth = '1988-11-02'
  WHERE id = '20000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET display_name = 'Dana (owner)'   WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET display_name = 'Eyal (owner)'   WHERE id = '10000000-0000-0000-0000-000000000002';

-- ═══ 2. BUSINESSES ═════════════════════════════════════════════════════════
-- Coordinates: real spots around Tel Aviv / Ramat Gan / Givatayim so the
-- discovery-feed distance ranking has something to sort by.
INSERT INTO public.businesses (id, owner_id, name, category, description, address, lat, lng, phone, qr_code_token, cover_url)
VALUES
  ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'פיצה רומא', 'food', 'פיצה נפוליטנית בטאבון עצים, דיזנגוף 145', 'דיזנגוף 145, תל אביב',
   32.0809, 34.7736, '03-5551234', 'seed-pizza-roma', 'https://picsum.photos/seed/pizzaroma/800/1200'),
  ('b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'שכונתי — מרקט פרש', 'food', 'ירקות, גבינות ולחם מחמצת מקומי', 'פלורנטין 20, תל אביב',
   32.0567, 34.7695, '03-5555678', 'seed-shchunati', 'https://picsum.photos/seed/shchunati/800/1200'),
  ('b0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
   'Urban Threads', 'clothing', 'Independent streetwear label & concept store', 'רוטשילד 40, תל אביב',
   32.0640, 34.7745, '03-5559012', 'seed-urban-threads', 'https://picsum.photos/seed/urbanthreads/800/1200'),
  ('b0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002',
   'GadgetHub', 'tech', 'Repairs, accessories and trade-ins', 'ביאליק 12, רמת גן',
   32.0680, 34.8248, '03-5553456', 'seed-gadgethub', 'https://picsum.photos/seed/gadgethub/800/1200'),
  ('b0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002',
   'פינת הבריאות', 'health', 'תוספי תזונה, ייעוץ נטורופתי וסדנאות', 'כצנלסון 60, גבעתיים',
   32.0722, 34.8106, '03-5557890', 'seed-health-corner', NULL)
ON CONFLICT (id) DO NOTHING;

-- ═══ 3. MEMBERSHIPS ════════════════════════════════════════════════════════
-- Alice → פיצה רומא (+ stamps) & Urban Threads.  Bob → שכונתי.
INSERT INTO public.memberships (id, user_id, business_id, total_stamps, joined_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 6, now() - interval '40 days'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000003', 0, now() - interval '9 days'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000002', 2, now() - interval '15 days')
ON CONFLICT (id) DO NOTHING;

-- ═══ 4. FEED POSTS ═════════════════════════════════════════════════════════
-- Public-read by RLS (migration 019). Mix of types; one already-expired row
-- on פיצה רומא to exercise the client-side freshness filter.
INSERT INTO public.feed_posts (id, business_id, type, title, body, image_url, cta_text, expires_at, created_at)
VALUES
  -- פיצה רומא
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'offer', '🍕 שני מגשים במחיר אחד — שלישי-רביעי',
   'כל מגש משפחתי שני על חשבוננו, בישיבה במקום בלבד. תקף עד סוף החודש.',
   'https://picsum.photos/seed/pizzadeal/800/1200', 'הצטרפו למועדון', now() + interval '20 days', now() - interval '2 hours'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'announcement', 'שעות פתיחה מורחבות בקיץ',
   'מעכשיו פתוחים עד חצות בימי חמישי, שישי ושבת.',
   NULL, NULL, now() + interval '60 days', now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'promotion', 'קרב הקפה של פורים — הסתיים',
   'תודה לכל מי שהשתתף! נתראה בשנה הבאה.',
   NULL, NULL, now() - interval '5 days', now() - interval '30 days'),
  -- שכונתי
  ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002',
   'offer', '🥬 סל ירקות שבועי — 20% הנחה לחברי מועדון',
   'מזמינים עד יום שלישי, אוספים ביום חמישי טרי מהשוק.',
   'https://picsum.photos/seed/veggiebox/800/1200', 'קבלו את ההטבה', now() + interval '14 days', now() - interval '6 hours'),
  ('f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002',
   'story', 'הגיעה תמורה טרייה של גבינות כבשים',
   'ישירות מהמשק בגליל, כמות מוגבלת.',
   NULL, NULL, now() + interval '2 days', now() - interval '1 day'),
  -- Urban Threads
  ('f0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003',
   'promotion', 'Drop 04 is live — members get first access',
   'The new winter capsule is in store now. Members save 15% through Sunday.',
   'https://picsum.photos/seed/urbandrop/800/1200', 'Join the club', now() + interval '10 days', now() - interval '5 hours'),
  ('f0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003',
   'announcement', 'Late-night shopping this Thursday',
   'Open until 23:00 with a DJ set and 2-for-1 on tees.',
   NULL, NULL, now() + interval '7 days', now() - interval '2 days'),
  -- GadgetHub
  ('f0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004',
   'offer', '📱 Free screen protector fitting with any repair',
   'Walk in, no appointment needed. This week only.',
   NULL, 'Join for the deal', now() + interval '5 days', now() - interval '8 hours'),
  ('f0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000004',
   'promotion', 'Trade in your old phone — €40 bonus credit',
   'On top of the market valuation, for club members.',
   'https://picsum.photos/seed/tradein/800/1200', NULL, now() + interval '30 days', now() - interval '4 days'),
  -- פינת הבריאות
  ('f0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000005',
   'announcement', '🧘 סדנת נשימה חינם — יום ראשון 18:00',
   'מספר המקומות מוגבל, הרשמה מראש בחנות.',
   NULL, 'שמרו מקום', now() + interval '4 days', now() - interval '12 hours'),
  ('f0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000005',
   'offer', 'קנו 2 תוספים — השלישי במתנה',
   'תקף על כל מגוון הוויטמינים והמינרלים.',
   NULL, 'הצטרפו למועדון', now() + interval '25 days', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ═══ 5. STORIES ════════════════════════════════════════════════════════════
-- Only for clubs Alice joined, so the Home story-ring row renders.
INSERT INTO public.stories (id, business_id, image_url, caption, cta_text, expires_at, created_at)
VALUES
  ('50c00000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'https://picsum.photos/seed/pizzastory/800/1400', 'התנור נדלק 🔥', NULL,
   now() + interval '20 hours', now() - interval '3 hours'),
  ('50c00000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003',
   'https://picsum.photos/seed/threadstory/800/1400', 'Fitting room, Drop 04', 'Shop now',
   now() + interval '16 hours', now() - interval '5 hours')
ON CONFLICT (id) DO NOTHING;

-- ═══ 6. PROMOTIONS ═════════════════════════════════════════════════════════
-- One active promotion per business (surfaced on the Discover screen).
INSERT INTO public.promotions (id, business_id, title, description, benefit_type, benefit_value, benefit_value_type, active)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'משקה חינם בהצטרפות', 'לימוננה או קפה על חשבון הבית לחברים חדשים', 'free_item', NULL, NULL, true),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   '10% הנחה על הקנייה הראשונה', NULL, 'discount', 10, 'percent', true),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
   '₪25 credit to spend in-store', 'Welcome credit for new members', 'credit', 2500, 'cents', true),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004',
   '15% off your first accessory', NULL, 'discount', 15, 'percent', true),
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005',
   'ייעוץ נטורופתי ראשון חינם', '20 דקות עם נטורופת מוסמך', 'free_item', NULL, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- ═══ 7. STAMP CARDS ════════════════════════════════════════════════════════
INSERT INTO public.stamp_cards (id, business_id, name, required_stamps, reward_type, reward_title, active)
VALUES
  ('57a00000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'כרטיסיית פיצה', 10, 'free_item', 'מגש אישי חינם', true),
  ('57a00000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   'כרטיסיית קנייה', 8, 'free_item', 'סל ירקות במתנה', true)
ON CONFLICT (id) DO NOTHING;

-- ═══ 8. WALLET BENEFITS (Alice) ════════════════════════════════════════════
INSERT INTO public.benefits (id, user_id, business_id, type, title, description, amount_cents, discount_percent, free_item_description, source, redeemed, redeemed_at, expires_at, created_at)
VALUES
  ('be000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'free_item', 'לימונדה על חשבון הבית',
   'הטבת הצטרפות', NULL, NULL, 'לימונדה ביתית', 'promotion', false, NULL,
   now() + interval '45 days', now() - interval '40 days'),
  ('be000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'credit', '₪20 קרדיט חבר מועדון',
   NULL, 2000, NULL, NULL, 'points', true, now() - interval '5 days',
   NULL, now() - interval '20 days'),
  ('be000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000003', 'discount', '15% הנחה על Drop 04',
   'תקף על כל הקולקציה החדשה', NULL, 15, NULL, 'promotion', false, NULL,
   now() + interval '10 days', now() - interval '5 hours')
ON CONFLICT (id) DO NOTHING;
