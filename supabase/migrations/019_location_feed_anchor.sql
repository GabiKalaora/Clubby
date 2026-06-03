-- Migration 019: Location discovery + promotions feed + get_benefits_export fix

-- ─── 1. POPULATE lat/lng ON EXISTING BUSINESSES (dev seed) ──────────────────
-- Real coordinates will come from the portal Settings geocoding
-- For demo: seed Test Coffee Shop with Tel Aviv coordinates
UPDATE public.businesses
SET lat = 32.0853, lng = 34.7818
WHERE qr_code_token = 'Olr2j-dMkjVN';

-- ─── 2. PROMOTIONS FEED POSTS ────────────────────────────────────────────────
-- A WhatsApp-style feed of posts from businesses (ads, offers, announcements)
-- NOT membership-gated — any business can post, any user near them can see it
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL DEFAULT 'promotion'
               CHECK (type IN ('promotion', 'announcement', 'story', 'offer')),
  title        TEXT        NOT NULL,
  body         TEXT,
  image_url    TEXT,
  cta_text     TEXT,
  cta_url      TEXT,
  expires_at   TIMESTAMPTZ NULL,
  active       BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_posts_public_read" ON public.feed_posts
  FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "feed_posts_owner_write" ON public.feed_posts
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Seed a few demo feed posts for Test Coffee Shop
INSERT INTO public.feed_posts (business_id, type, title, body, cta_text, expires_at)
SELECT id,
  'offer',
  '☕ Happy Hour — 20% off all drinks',
  'כל המשקאות בהנחה של 20% בין 15:00 ל-18:00. כל יום!',
  'הצטרף למועדון',
  now() + interval '30 days'
FROM public.businesses WHERE name = 'Test Coffee Shop'
ON CONFLICT DO NOTHING;

INSERT INTO public.feed_posts (business_id, type, title, body, cta_text, expires_at)
SELECT id,
  'announcement',
  '🎉 סניף חדש נפתח ברוטשילד!',
  'אנחנו שמחים לבשר על פתיחת הסניף החדש שלנו ברחוב רוטשילד 22, תל אביב. בואו לבקר!',
  'קבל הטבה',
  now() + interval '14 days'
FROM public.businesses WHERE name = 'Test Coffee Shop'
ON CONFLICT DO NOTHING;

-- ─── 3. FIX get_benefits_export RPC (was called in Dashboard but never created) ──
CREATE OR REPLACE FUNCTION public.get_benefits_export(p_business_id UUID)
RETURNS TABLE(
  created_at   TIMESTAMPTZ,
  member_name  TEXT,
  phone        TEXT,
  title        TEXT,
  type         TEXT,
  value        TEXT,
  source       TEXT,
  redeemed     BOOLEAN,
  redeemed_at  TIMESTAMPTZ
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
    SELECT
      b.created_at,
      p.display_name,
      p.phone,
      b.title,
      b.type,
      CASE
        WHEN b.type = 'credit'    THEN '₪' || (b.amount_cents / 100)::TEXT
        WHEN b.type = 'discount'  THEN b.discount_percent::TEXT || '%'
        ELSE COALESCE(b.free_item_description, b.title)
      END AS value,
      b.source,
      b.redeemed,
      b.redeemed_at
    FROM public.benefits b
    JOIN public.profiles p ON p.id = b.user_id
    WHERE b.business_id = p_business_id
    ORDER BY b.created_at DESC;
END;
$$;

-- ─── 4. CROSS-BUSINESS ANALYTICS RPCs (for anchor client dashboard) ──────────

-- Platform-wide stats (admin only — no ownership check, used by anchor view)
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_businesses',     (SELECT count(*) FROM public.businesses),
    'total_members',        (SELECT count(*) FROM public.profiles),
    'total_benefits',       (SELECT count(*) FROM public.benefits),
    'redeemed_benefits',    (SELECT count(*) FROM public.benefits WHERE redeemed = true),
    'total_memberships',    (SELECT count(*) FROM public.memberships WHERE active = true),
    'businesses_by_category', (
      SELECT jsonb_agg(row_to_json(r))
      FROM (
        SELECT category, count(*) as count
        FROM public.businesses
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
      ) r
    )
  );
END;
$$;

-- Daily new users (last 30 days) — platform wide
CREATE OR REPLACE FUNCTION public.get_platform_growth()
RETURNS TABLE(day DATE, new_users BIGINT, new_memberships BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      d::DATE AS day,
      COALESCE((SELECT count(*) FROM public.profiles p WHERE p.created_at::DATE = d::DATE), 0) AS new_users,
      COALESCE((SELECT count(*) FROM public.memberships m WHERE m.joined_at::DATE = d::DATE), 0) AS new_memberships
    FROM generate_series(now() - interval '29 days', now(), interval '1 day') AS d
    ORDER BY day;
END;
$$;

-- Top businesses by member count
CREATE OR REPLACE FUNCTION public.get_top_businesses(p_limit INT DEFAULT 10)
RETURNS TABLE(
  business_id   UUID,
  business_name TEXT,
  category      TEXT,
  member_count  BIGINT,
  benefit_count BIGINT,
  redemption_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      b.id,
      b.name,
      b.category,
      count(DISTINCT m.user_id) AS member_count,
      count(DISTINCT bn.id) AS benefit_count,
      CASE WHEN count(DISTINCT bn.id) > 0
           THEN round(count(DISTINCT bn.id) FILTER (WHERE bn.redeemed) * 100.0 / count(DISTINCT bn.id), 1)
           ELSE 0 END AS redemption_rate
    FROM public.businesses b
    LEFT JOIN public.memberships m ON m.business_id = b.id AND m.active = true
    LEFT JOIN public.benefits bn ON bn.business_id = b.id
    GROUP BY b.id, b.name, b.category
    ORDER BY member_count DESC
    LIMIT p_limit;
END;
$$;
