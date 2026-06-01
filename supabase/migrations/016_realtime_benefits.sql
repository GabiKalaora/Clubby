-- Migration 016: Enable Realtime on benefits table
-- Allows mobile app to receive live updates when benefits are issued or redeemed

ALTER PUBLICATION supabase_realtime ADD TABLE public.benefits;
