-- RLS Policy Tests
-- Run against local Supabase: psql $DATABASE_URL -f supabase/tests/rls.test.sql
-- All assertions must pass before building any UI.

BEGIN;

-- Setup: create two test users (trigger auto-creates profile rows)
INSERT INTO auth.users (id, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', '+1111111111'),
  ('00000000-0000-0000-0000-000000000002', '+2222222222');

-- Setup: user1 owns a business (must bypass RLS via postgres role)
INSERT INTO public.businesses (id, owner_id, name, qr_code_token) VALUES
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Test Cafe', 'test-token-001');

-- Setup: user1 has a membership + benefit
INSERT INTO public.memberships (id, user_id, business_id) VALUES
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001');

INSERT INTO public.benefits (id, user_id, business_id, type, title, amount_cents, source) VALUES
  ('be100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'credit', 'Welcome Credit', 1000, 'qr_scan');

-- ============================================================
-- Test 1: user2 cannot read user1's profile
-- ============================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000002"}';

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001';
  ASSERT v_count = 0, 'FAIL: user2 can read user1 profile';
  RAISE NOTICE 'PASS: Test 1 - user2 cannot read user1 profile';
END $$;

-- ============================================================
-- Test 2: user2 cannot read user1's benefits
-- ============================================================
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.benefits WHERE user_id = '00000000-0000-0000-0000-000000000001';
  ASSERT v_count = 0, 'FAIL: user2 can read user1 benefits';
  RAISE NOTICE 'PASS: Test 2 - user2 cannot read user1 benefits';
END $$;

-- ============================================================
-- Test 3: user1 can read their own benefits
-- ============================================================
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.benefits WHERE user_id = '00000000-0000-0000-0000-000000000001';
  ASSERT v_count = 1, 'FAIL: user1 cannot read own benefits';
  RAISE NOTICE 'PASS: Test 3 - user1 can read own benefits';
END $$;

-- ============================================================
-- Test 4: both users can read businesses (public)
-- ============================================================
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000002"}';

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.businesses WHERE id = 'b1000000-0000-0000-0000-000000000001';
  ASSERT v_count = 1, 'FAIL: user2 cannot read public businesses';
  RAISE NOTICE 'PASS: Test 4 - businesses are publicly readable';
END $$;

-- ============================================================
-- Test 5: user2 cannot update user1's business
-- ============================================================
DO $$
DECLARE v_name TEXT;
BEGIN
  UPDATE public.businesses SET name = 'Hacked' WHERE id = 'b1000000-0000-0000-0000-000000000001';
  SELECT name INTO v_name FROM public.businesses WHERE id = 'b1000000-0000-0000-0000-000000000001';
  ASSERT v_name = 'Test Cafe', 'FAIL: user2 updated user1 business (name changed to: ' || COALESCE(v_name, 'null') || ')';
  RAISE NOTICE 'PASS: Test 5 - user2 blocked from updating user1 business (name unchanged)';
END $$;

-- ============================================================
-- Test 6: user2 cannot insert manual benefit for user1
-- ============================================================
DO $$
BEGIN
  INSERT INTO public.benefits (user_id, business_id, type, title, amount_cents, source)
  VALUES ('00000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'credit', 'Fake', 9999, 'manual');
  RAISE NOTICE 'FAIL: user2 inserted benefit for user1 (should have been blocked)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PASS: Test 6 - user2 blocked from inserting benefit for user1';
END $$;

DO $$ BEGIN RAISE NOTICE '=== All RLS tests complete ==='; END $$;

ROLLBACK;
