-- Migration 013: Referral support

ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS referred_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Allow benefits source to include 'referral'
ALTER TABLE public.benefits DROP CONSTRAINT IF EXISTS benefits_source_check;
ALTER TABLE public.benefits ADD CONSTRAINT benefits_source_check
  CHECK (source = ANY (ARRAY['qr_scan','manual','promotion','store_owner','stamp_card','birthday','referral']));
