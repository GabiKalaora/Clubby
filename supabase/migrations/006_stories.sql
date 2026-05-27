-- Stories posted by business owners (Instagram-style, 24h default expiry)
CREATE TABLE public.stories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  image_url    TEXT,
  caption      TEXT,
  cta_text     TEXT,
  cta_url      TEXT,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX stories_business_active_idx ON public.stories (business_id, expires_at);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-expired stories
CREATE POLICY "stories: public read" ON public.stories
  FOR SELECT USING (expires_at > now());

-- Only business owner can insert/update/delete
CREATE POLICY "stories: owner write" ON public.stories
  FOR ALL USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Storage bucket for story images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to story-images
CREATE POLICY "story-images: auth upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'story-images');

-- Anyone can read story images
CREATE POLICY "story-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-images');

-- Owner can delete their uploads
CREATE POLICY "story-images: auth delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'story-images');
