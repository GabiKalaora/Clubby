-- Migration 011: Birthday rewards + re-engagement

-- Add date_of_birth to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL;

-- Daily cron: send birthday rewards (runs at 08:00 UTC every day)
-- Handled by edge function; this schedules it
SELECT cron.schedule(
  'send-birthday-rewards',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-birthday-rewards',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Daily cron: re-engage lapsed members (runs at 09:00 UTC every day)
SELECT cron.schedule(
  're-engage-lapsed',
  '0 9 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/re-engage-lapsed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
