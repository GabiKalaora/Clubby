-- Migration 018: Store cover photo + multi-device push tokens

-- ─── 1. STORE COVER PHOTO ────────────────────────────────────────────────────
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS cover_url TEXT NULL;

-- ─── 2. MULTI-DEVICE PUSH TOKENS ─────────────────────────────────────────────
-- Replaces the single expo_push_token column on profiles
-- Supports multiple devices per user and web push

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL,
  platform    TEXT        NOT NULL DEFAULT 'mobile' CHECK (platform IN ('mobile', 'web')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_user_manage" ON public.push_tokens
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "push_tokens_service_read" ON public.push_tokens
  FOR SELECT USING (true); -- edge functions use service role

-- Back-fill existing expo_push_tokens into the new table
INSERT INTO public.push_tokens (user_id, token, platform)
SELECT id, expo_push_token, 'mobile'
FROM public.profiles
WHERE expo_push_token IS NOT NULL
  AND expo_push_token != ''
ON CONFLICT (user_id, token) DO NOTHING;

-- Cleanup cron: remove tokens not seen in 60 days
SELECT cron.schedule(
  'cleanup-push-tokens',
  '0 3 * * *',
  $$
    DELETE FROM public.push_tokens
    WHERE last_seen < now() - interval '60 days';
  $$
);
