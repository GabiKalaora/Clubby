-- Migration 010: Stamp cards + record-stamp RPC

-- Extend benefits.source to include new automated sources
ALTER TABLE public.benefits DROP CONSTRAINT IF EXISTS benefits_source_check;
ALTER TABLE public.benefits ADD CONSTRAINT benefits_source_check
  CHECK (source = ANY (ARRAY['qr_scan','manual','promotion','store_owner','stamp_card','birthday']));

-- Allow business owner to read + update-redeemed benefits for cashier verification
CREATE POLICY "benefits: owner read by business"
  ON public.benefits FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "benefits: owner update redeemed"
  ON public.benefits FOR UPDATE
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Allow business owner to read display_name of their members (for verify redemption UI)
CREATE POLICY "profiles: business owner read members"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT m.user_id FROM public.memberships m
      JOIN public.businesses b ON b.id = m.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Stamp card definitions (business-owned)
CREATE TABLE IF NOT EXISTS public.stamp_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  required_stamps INT  NOT NULL DEFAULT 10,
  reward_type     TEXT NOT NULL DEFAULT 'free_item', -- 'free_item' | 'credit' | 'discount'
  reward_title    TEXT NOT NULL,
  reward_value    INT  NULL,  -- cents for credit, percent for discount, null for free_item
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User stamp progress per card
CREATE TABLE IF NOT EXISTS public.stamp_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stamp_card_id   UUID NOT NULL REFERENCES public.stamp_cards(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  current_stamps  INT  NOT NULL DEFAULT 0,
  completed       BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, stamp_card_id)
);

-- RLS: stamp_cards
ALTER TABLE public.stamp_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stamp_cards_read_all" ON public.stamp_cards
  FOR SELECT USING (true);

CREATE POLICY "stamp_cards_owner_write" ON public.stamp_cards
  FOR ALL USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- RLS: stamp_records
ALTER TABLE public.stamp_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stamp_records_user_read" ON public.stamp_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "stamp_records_service_write" ON public.stamp_records
  FOR ALL USING (true);  -- edge function uses service role

-- RPC: get_stamp_cards — returns stamp cards with user's current progress
CREATE OR REPLACE FUNCTION public.get_stamp_cards(p_business_id UUID, p_user_id UUID)
RETURNS TABLE(
  id              UUID,
  name            TEXT,
  required_stamps INT,
  reward_type     TEXT,
  reward_title    TEXT,
  reward_value    INT,
  current_stamps  INT,
  completed       BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      sc.id,
      sc.name,
      sc.required_stamps,
      sc.reward_type,
      sc.reward_title,
      sc.reward_value,
      COALESCE(sr.current_stamps, 0)::INT AS current_stamps,
      COALESCE(sr.completed, false) AS completed
    FROM public.stamp_cards sc
    LEFT JOIN public.stamp_records sr
      ON sr.stamp_card_id = sc.id AND sr.user_id = p_user_id
    WHERE sc.business_id = p_business_id
      AND sc.active = true
    ORDER BY sc.created_at;
END;
$$;

-- RPC: record_stamp — owner adds a stamp for a customer; auto-completes card if threshold reached
CREATE OR REPLACE FUNCTION public.record_stamp(
  p_business_id  UUID,
  p_user_id      UUID,
  p_stamp_card_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card        public.stamp_cards%ROWTYPE;
  v_record      public.stamp_records%ROWTYPE;
  v_new_stamps  INT;
  v_completed   BOOLEAN := false;
  v_benefit_id  UUID;
BEGIN
  -- Ownership check
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Load card
  SELECT * INTO v_card FROM public.stamp_cards
  WHERE id = p_stamp_card_id AND business_id = p_business_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stamp card not found';
  END IF;

  -- Check card not already completed for this user
  SELECT * INTO v_record FROM public.stamp_records
  WHERE user_id = p_user_id AND stamp_card_id = p_stamp_card_id;

  IF FOUND AND v_record.completed THEN
    RETURN jsonb_build_object('error', 'Card already completed');
  END IF;

  -- Upsert stamp record
  IF NOT FOUND THEN
    INSERT INTO public.stamp_records(user_id, stamp_card_id, business_id, current_stamps)
    VALUES (p_user_id, p_stamp_card_id, p_business_id, 1)
    RETURNING * INTO v_record;
    v_new_stamps := 1;
  ELSE
    v_new_stamps := v_record.current_stamps + 1;
    UPDATE public.stamp_records SET current_stamps = v_new_stamps WHERE id = v_record.id;
  END IF;

  -- Check completion
  IF v_new_stamps >= v_card.required_stamps THEN
    v_completed := true;
    UPDATE public.stamp_records
    SET completed = true, completed_at = now()
    WHERE id = v_record.id;

    -- Issue reward benefit
    v_benefit_id := gen_random_uuid();
    INSERT INTO public.benefits(
      id, user_id, business_id, type, title,
      amount_cents, discount_percent, free_item_description,
      source, verified, redeemed
    ) VALUES (
      v_benefit_id,
      p_user_id,
      p_business_id,
      v_card.reward_type,
      v_card.reward_title,
      CASE WHEN v_card.reward_type = 'credit'   THEN v_card.reward_value ELSE NULL END,
      CASE WHEN v_card.reward_type = 'discount' THEN v_card.reward_value ELSE NULL END,
      CASE WHEN v_card.reward_type = 'free_item' THEN v_card.reward_title ELSE NULL END,
      'stamp_card',
      true,
      false
    );
  END IF;

  RETURN jsonb_build_object(
    'current_stamps', v_new_stamps,
    'required_stamps', v_card.required_stamps,
    'completed', v_completed,
    'benefit_id', v_benefit_id
  );
END;
$$;

-- RPC: get_stamp_progress_for_business — portal: list members + stamp progress for a card
CREATE OR REPLACE FUNCTION public.get_stamp_progress(p_stamp_card_id UUID)
RETURNS TABLE(
  user_id        UUID,
  display_name   TEXT,
  phone          TEXT,
  current_stamps INT,
  completed      BOOLEAN,
  completed_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
BEGIN
  SELECT sc.business_id INTO v_business_id
  FROM public.stamp_cards sc WHERE sc.id = p_stamp_card_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = v_business_id AND b.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
    SELECT
      sr.user_id,
      pr.display_name,
      pr.phone,
      sr.current_stamps,
      sr.completed,
      sr.completed_at
    FROM public.stamp_records sr
    JOIN public.profiles pr ON pr.id = sr.user_id
    WHERE sr.stamp_card_id = p_stamp_card_id
    ORDER BY sr.current_stamps DESC;
END;
$$;
