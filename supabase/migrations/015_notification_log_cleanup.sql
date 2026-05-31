-- Migration 015: notification_log cleanup cron
-- Deletes notification_log rows older than 90 days, runs daily at 02:00 UTC

SELECT cron.schedule(
  'cleanup-notification-log',
  '0 2 * * *',
  $$
    DELETE FROM public.notification_log
    WHERE sent_at < now() - interval '90 days';
  $$
);
