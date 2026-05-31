-- Migration 009: RPCs for portal improvements
-- Adds get_member_benefits and get_member_growth RPCs

-- Returns benefits issued to a specific member at a specific business
CREATE OR REPLACE FUNCTION public.get_member_benefits(p_business_id UUID, p_user_id UUID)
RETURNS TABLE(
  id               UUID,
  title            TEXT,
  type             TEXT,
  amount_cents     INT,
  discount_percent INT,
  free_item_description TEXT,
  source           TEXT,
  redeemed         BOOLEAN,
  redeemed_at      TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
    SELECT ben.id, ben.title, ben.type, ben.amount_cents, ben.discount_percent,
           ben.free_item_description, ben.source, ben.redeemed, ben.redeemed_at,
           ben.expires_at, ben.created_at
    FROM public.benefits ben
    WHERE ben.business_id = p_business_id AND ben.user_id = p_user_id
    ORDER BY ben.created_at DESC;
END;
$$;

-- Returns daily new member counts for the last 30 days (for growth chart)
CREATE OR REPLACE FUNCTION public.get_member_growth(p_business_id UUID)
RETURNS TABLE(
  day         DATE,
  new_members BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
    SELECT d::DATE AS day, COUNT(m.id) AS new_members
    FROM generate_series(
      (CURRENT_DATE - INTERVAL '29 days')::TIMESTAMP,
      CURRENT_DATE::TIMESTAMP,
      '1 day'::INTERVAL
    ) AS d
    LEFT JOIN public.memberships m
      ON m.business_id = p_business_id
      AND m.joined_at::DATE = d::DATE
      AND m.active = TRUE
    GROUP BY d
    ORDER BY d;
END;
$$;

-- Returns daily redemption counts for the last 30 days
CREATE OR REPLACE FUNCTION public.get_redemption_trend(p_business_id UUID)
RETURNS TABLE(
  day        DATE,
  redeemed   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
    SELECT d::DATE AS day, COUNT(b.id) AS redeemed
    FROM generate_series(
      (CURRENT_DATE - INTERVAL '29 days')::TIMESTAMP,
      CURRENT_DATE::TIMESTAMP,
      '1 day'::INTERVAL
    ) AS d
    LEFT JOIN public.benefits b
      ON b.business_id = p_business_id
      AND b.redeemed = TRUE
      AND b.redeemed_at::DATE = d::DATE
    GROUP BY d
    ORDER BY d;
END;
$$;
