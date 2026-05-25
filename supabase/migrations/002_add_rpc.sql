-- Migration 002: Add increment_redemption_count RPC for enroll-member edge function
CREATE OR REPLACE FUNCTION public.increment_redemption_count(promo_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.promotions
  SET redemption_count = redemption_count + 1
  WHERE id = promo_id;
$$;
