-- Migration 001: Initial schema
-- IMPORTANT: uuid-ossp required for uuid_generate_v5 in enroll-member edge function
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  expo_push_token TEXT, -- MVP: single device; Phase 2 → push_tokens table
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Businesses
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT, -- 'clothing' | 'shoes' | 'food' | 'service' | 'health' | 'tech' | 'other'
  description TEXT,
  logo_url TEXT,
  address TEXT,
  lat FLOAT8,
  lng FLOAT8,
  phone TEXT,
  -- Shape: { mon?: { open: "09:00", close: "18:00" }, ... }
  -- Import OpeningHours from @clubby/shared — do NOT invent inline shapes
  opening_hours JSONB,
  qr_code_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Memberships (customer joins a business club)
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  UNIQUE(user_id, business_id)
);

-- Promotions (created by business owners)
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('credit', 'discount', 'free_item')),
  benefit_value NUMERIC,
  benefit_value_type TEXT,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_redemptions INT,
  redemption_count INT DEFAULT 0 NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Benefits (customer wallet items)
CREATE TABLE public.benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'discount', 'free_item')),
  title TEXT NOT NULL,
  description TEXT,
  -- Monetary credit: use integer cents, NEVER float
  amount_cents INT,
  -- Percentage discount
  discount_percent INT,
  -- Free item
  free_item_description TEXT,
  expires_at TIMESTAMPTZ,
  redeemed BOOLEAN DEFAULT FALSE NOT NULL,
  redeemed_at TIMESTAMPTZ,
  source TEXT NOT NULL CHECK (source IN ('qr_scan', 'manual', 'promotion', 'store_owner')),
  -- false = manually added by user; true = business-issued
  verified BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Idempotency: user can only receive each promotion once (prevents QR retry duplicates)
  UNIQUE(user_id, promotion_id)
);

-- Notification log
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  benefit_id UUID REFERENCES public.benefits(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('expiry_reminder', 'new_promotion', 'direct_message')),
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  message TEXT
);

-- Indexes for common queries
CREATE INDEX idx_benefits_user_id ON public.benefits(user_id);
CREATE INDEX idx_benefits_expires_at ON public.benefits(expires_at) WHERE redeemed = FALSE;
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_businesses_category ON public.businesses(category);
CREATE INDEX idx_businesses_qr_token ON public.businesses(qr_code_token);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- profiles: users manage own row only
CREATE POLICY "profiles: own row" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- businesses: public read; owner write
CREATE POLICY "businesses: public read" ON public.businesses
  FOR SELECT USING (TRUE);
CREATE POLICY "businesses: owner insert" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "businesses: owner update" ON public.businesses
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "businesses: owner delete" ON public.businesses
  FOR DELETE USING (auth.uid() = owner_id);

-- memberships: users manage own; businesses read their members
CREATE POLICY "memberships: own rows" ON public.memberships
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "memberships: business reads members" ON public.memberships
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- benefits: users read own; service role inserts (edge functions use service role)
CREATE POLICY "benefits: own read" ON public.benefits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "benefits: own insert manual" ON public.benefits
  FOR INSERT WITH CHECK (auth.uid() = user_id AND source = 'manual');
CREATE POLICY "benefits: own update redeem" ON public.benefits
  FOR UPDATE USING (auth.uid() = user_id);

-- promotions: public read active; business owner write
CREATE POLICY "promotions: public read active" ON public.promotions
  FOR SELECT USING (active = TRUE);
CREATE POLICY "promotions: owner write" ON public.promotions
  FOR ALL USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- notification_log: users read own
CREATE POLICY "notification_log: own read" ON public.notification_log
  FOR SELECT USING (auth.uid() = user_id);

-- Auto-create profile row on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone)
  VALUES (NEW.id, NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
