-- Migration 012: Extend notification_log type constraint to include birthday + re_engagement

ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_type_check;

ALTER TABLE public.notification_log ADD CONSTRAINT notification_log_type_check
  CHECK (type = ANY (ARRAY['expiry_reminder','new_promotion','direct_message','birthday','re_engagement']));
