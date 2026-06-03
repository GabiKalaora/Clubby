-- Migration 017: Tiers, Points, Multi-Location

-- ─── 1. AVATAR STORAGE BUCKET ────────────────────────────────────────────────
-- Created programmatically — bucket 'user-avatars' is public read, owner write

-- ─── 2. TIERS ────────────────────────────────────────────────────────────────

-- Total stamps ever earned per user per business (persists across card resets)
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS total_stamps INT NOT NULL DEFAULT 0;

-- Tier definitions configured by business owners
CREATE TABLE IF NOT EXISTS public.tiers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  min_stamps  INT         NOT NULL DEFAULT 0,
  color       TEXT        NOT NULL DEFAULT '#cd7f32',
  icon        TEXT        NOT NULL DEFAULT '🥉',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, min_stamps)
);

ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tiers_public_read" ON public.tiers
  FOR SELECT USING (true);

CREATE POLICY "tiers_owner_write" ON public.tiers
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Insert default Bronze/Silver/Gold tiers for all existing businesses
INSERT INTO public.tiers (business_id, name, min_stamps, color, icon)
SELECT id, 'Bronze', 0,  '#cd7f32', '🥉' FROM public.businesses
ON CONFLICT DO NOTHING;
INSERT INTO public.tiers (business_id, name, min_stamps, color, icon)
SELECT id, 'Silver', 10, '#c0c0c0', '🥈' FROM public.businesses
ON CONFLICT DO NOTHING;
INSERT INTO public.tiers (business_id, name, min_stamps, color, icon)
SELECT id, 'Gold',   25, '#ffd700', '🥇' FROM public.businesses
ON CONFLICT DO NOTHING;

-- RPC: get current tier for a user at a business
CREATE OR REPLACE FUNCTION public.get_member_tier(p_business_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_stamps  INT := 0;
  v_tier          RECORD;
  v_next_tier     RECORD;
BEGIN
  SELECT COALESCE(total_stamps, 0) INTO v_total_stamps
  FROM public.memberships
  WHERE user_id = p_user_id AND business_id = p_business_id;

  -- Current tier = highest tier whose min_stamps <= total_stamps
  SELECT * INTO v_tier
  FROM public.tiers
  WHERE business_id = p_business_id AND min_stamps <= v_total_stamps
  ORDER BY min_stamps DESC LIMIT 1;

  -- Next tier = lowest tier whose min_stamps > total_stamps
  SELECT * INTO v_next_tier
  FROM public.tiers
  WHERE business_id = p_business_id AND min_stamps > v_total_stamps
  ORDER BY min_stamps ASC LIMIT 1;

  RETURN jsonb_build_object(
    'total_stamps',     v_total_stamps,
    'tier_name',        COALESCE(v_tier.name, 'Bronze'),
    'tier_color',       COALESCE(v_tier.color, '#cd7f32'),
    'tier_icon',        COALESCE(v_tier.icon, '🥉'),
    'next_tier_name',   v_next_tier.name,
    'next_tier_color',  v_next_tier.color,
    'stamps_to_next',   CASE WHEN v_next_tier.min_stamps IS NOT NULL
                             THEN v_next_tier.min_stamps - v_total_stamps
                             ELSE NULL END
  );
END;
$$;

-- ─── 3. POINTS ───────────────────────────────────────────────────────────────

-- Points programs (one per business, store-defined rules)
CREATE TABLE IF NOT EXISTS public.points_programs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL DEFAULT 'Points',
  points_per_scan INT       NOT NULL DEFAULT 10,
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Points rewards (redeemable at certain point thresholds)
CREATE TABLE IF NOT EXISTS public.points_rewards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID        NOT NULL REFERENCES public.points_programs(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  points_cost INT         NOT NULL,
  reward_type TEXT        NOT NULL DEFAULT 'free_item'
                          CHECK (reward_type IN ('free_item','credit','discount')),
  reward_value INT        NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-user points balance
CREATE TABLE IF NOT EXISTS public.points_balances (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_id  UUID        NOT NULL REFERENCES public.points_programs(id) ON DELETE CASCADE,
  business_id UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  balance     INT         NOT NULL DEFAULT 0,
  total_earned INT        NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, program_id)
);

ALTER TABLE public.points_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_rewards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "points_programs_public_read" ON public.points_programs
  FOR SELECT USING (true);
CREATE POLICY "points_programs_owner_write" ON public.points_programs
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "points_rewards_public_read" ON public.points_rewards
  FOR SELECT USING (true);
CREATE POLICY "points_rewards_owner_write" ON public.points_rewards
  FOR ALL USING (
    program_id IN (
      SELECT pp.id FROM public.points_programs pp
      JOIN public.businesses b ON b.id = pp.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

CREATE POLICY "points_balances_user_read" ON public.points_balances
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "points_balances_service_write" ON public.points_balances
  FOR ALL USING (true); -- edge functions use service role

-- RPC: earn points (called by enroll-member / after each visit)
CREATE OR REPLACE FUNCTION public.earn_points(p_business_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program  public.points_programs%ROWTYPE;
  v_balance  INT;
BEGIN
  -- Find active points program for this business
  SELECT * INTO v_program
  FROM public.points_programs
  WHERE business_id = p_business_id AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('earned', 0, 'balance', 0, 'program', null);
  END IF;

  -- Upsert balance
  INSERT INTO public.points_balances (user_id, program_id, business_id, balance, total_earned)
  VALUES (p_user_id, v_program.id, p_business_id, v_program.points_per_scan, v_program.points_per_scan)
  ON CONFLICT (user_id, program_id) DO UPDATE
    SET balance      = points_balances.balance + v_program.points_per_scan,
        total_earned = points_balances.total_earned + v_program.points_per_scan,
        updated_at   = now()
  RETURNING balance INTO v_balance;

  RETURN jsonb_build_object(
    'earned',  v_program.points_per_scan,
    'balance', v_balance,
    'program', jsonb_build_object('id', v_program.id, 'name', v_program.name)
  );
END;
$$;

-- RPC: redeem points for a reward
CREATE OR REPLACE FUNCTION public.redeem_points(
  p_reward_id UUID,
  p_user_id   UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward   public.points_rewards%ROWTYPE;
  v_program  public.points_programs%ROWTYPE;
  v_balance  INT;
  v_benefit_id UUID;
BEGIN
  -- Load reward
  SELECT r.*, p.* INTO v_reward
  FROM public.points_rewards r
  JOIN public.points_programs p ON p.id = r.program_id
  WHERE r.id = p_reward_id AND r.active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Reward not found or inactive');
  END IF;

  -- Check balance
  SELECT balance INTO v_balance
  FROM public.points_balances
  WHERE user_id = p_user_id AND program_id = v_reward.program_id;

  IF v_balance IS NULL OR v_balance < v_reward.points_cost THEN
    RETURN jsonb_build_object('error', 'Insufficient points', 'balance', COALESCE(v_balance,0), 'cost', v_reward.points_cost);
  END IF;

  -- Deduct points
  UPDATE public.points_balances
  SET balance = balance - v_reward.points_cost, updated_at = now()
  WHERE user_id = p_user_id AND program_id = v_reward.program_id;

  -- Issue benefit
  v_benefit_id := gen_random_uuid();
  INSERT INTO public.benefits (
    id, user_id, business_id, type, title,
    amount_cents, discount_percent, free_item_description,
    source, verified, redeemed
  ) VALUES (
    v_benefit_id,
    p_user_id,
    (SELECT business_id FROM public.points_programs WHERE id = v_reward.program_id),
    v_reward.reward_type,
    v_reward.name,
    CASE WHEN v_reward.reward_type = 'credit'   THEN v_reward.reward_value ELSE NULL END,
    CASE WHEN v_reward.reward_type = 'discount' THEN v_reward.reward_value ELSE NULL END,
    CASE WHEN v_reward.reward_type = 'free_item' THEN v_reward.name ELSE NULL END,
    'points',
    true,
    false
  );

  RETURN jsonb_build_object(
    'success',    true,
    'benefit_id', v_benefit_id,
    'new_balance', v_balance - v_reward.points_cost
  );
END;
$$;

-- ─── 4. MULTI-LOCATION QR ────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Additional QR tokens per business (for branches / locations)
CREATE TABLE IF NOT EXISTS public.business_locations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  address         TEXT,
  qr_code_token   TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(9), 'base64'),
  active          BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_public_read" ON public.business_locations
  FOR SELECT USING (true);

CREATE POLICY "locations_owner_write" ON public.business_locations
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Add source to benefits constraint to include 'points'
ALTER TABLE public.benefits DROP CONSTRAINT IF EXISTS benefits_source_check;
ALTER TABLE public.benefits ADD CONSTRAINT benefits_source_check
  CHECK (source = ANY (ARRAY[
    'qr_scan','manual','promotion','store_owner',
    'stamp_card','birthday','referral','points'
  ]));
