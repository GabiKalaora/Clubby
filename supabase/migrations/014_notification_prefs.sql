-- Migration 014: Notification preferences
-- JSONB column on profiles with per-type opt-out flags
-- Default: all enabled (null = all on; only store when user changes something)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  notification_prefs JSONB NULL;

-- Shape: { expiry_reminder: bool, birthday: bool, re_engagement: bool, direct_message: bool }
-- Absence of a key = true (opted in)
