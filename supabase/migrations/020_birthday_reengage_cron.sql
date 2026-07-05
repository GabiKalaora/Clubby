-- Migration 020: Birthday cron + re-engage cron + geocode helper

-- ─── 1. SCHEDULE BIRTHDAY REWARDS (daily at 8am) ─────────────────────────────
-- send-birthday-rewards edge function already exists — just needs scheduling
SELECT cron.schedule(
  'send-birthday-rewards',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/send-birthday-rewards',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body   := '{}'::jsonb
  );
  $$
);

-- ─── 2. SCHEDULE RE-ENGAGEMENT (daily at 10am) ───────────────────────────────
-- re-engage-lapsed edge function already exists — schedule it too
SELECT cron.schedule(
  're-engage-lapsed',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/re-engage-lapsed',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body   := '{}'::jsonb
  );
  $$
);

-- ─── 3. VERIFY CRON JOBS ─────────────────────────────────────────────────────
-- After this migration, you should have 5 cron jobs:
--   send-expiry-reminders    (0 9 * * *)
--   send-birthday-rewards    (0 8 * * *)  ← NEW
--   re-engage-lapsed         (0 10 * * *) ← NEW
--   cleanup-notification-log (0 2 * * *)
--   cleanup-push-tokens      (0 3 * * *)
