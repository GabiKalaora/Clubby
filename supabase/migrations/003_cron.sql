-- Migration 003: pg_cron schedule for send-expiry-reminders Edge Function
-- pg_cron is pre-installed in Supabase; pg_net is required for HTTP calls from SQL
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule: daily at 09:00 UTC
-- Calls the send-expiry-reminders edge function via HTTP
SELECT cron.schedule(
  'send-expiry-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/send-expiry-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body   := '{}'::jsonb
  );
  $$
);
