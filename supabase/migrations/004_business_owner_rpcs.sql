-- Migration 004: business owner stats RPC + member reads
-- Allows business owners to read aggregate stats and member profiles

-- Stats function: returns member/promotion/benefit counts for a business
-- SECURITY DEFINER bypasses RLS; ownership is checked inside
CREATE OR REPLACE FUNCTION public.get_business_stats(p_business_id UUID)
RETURNS TABLE(
  member_count      BIGINT,
  active_promotions BIGINT,
  total_benefits    BIGINT,
  redeemed_benefits BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM public.memberships  WHERE business_id = p_business_id AND active = TRUE),
    (SELECT COUNT(*) FROM public.promotions   WHERE business_id = p_business_id AND active = TRUE),
    (SELECT COUNT(*) FROM public.benefits     WHERE business_id = p_business_id),
    (SELECT COUNT(*) FROM public.benefits     WHERE business_id = p_business_id AND redeemed = TRUE);
END;
$$;

-- Members function: returns member profiles for a business owner
CREATE OR REPLACE FUNCTION public.get_business_members(p_business_id UUID)
RETURNS TABLE(
  user_id      UUID,
  display_name TEXT,
  phone        TEXT,
  joined_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
    SELECT p.id, p.display_name, p.phone, m.joined_at
    FROM public.memberships m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.business_id = p_business_id AND m.active = TRUE
    ORDER BY m.joined_at DESC;
END;
$$;
