-- Storage bucket for business logos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read business logos
CREATE POLICY "business-logos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

-- Only the business owner can upload logos (path: {businessId}/logo.{ext})
CREATE POLICY "business-logos: owner insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos'
    AND auth.uid() IN (
      SELECT owner_id FROM public.businesses
      WHERE id = split_part(name, '/', 1)::uuid
    )
  );

-- Only the business owner can update logos
CREATE POLICY "business-logos: owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND auth.uid() IN (
      SELECT owner_id FROM public.businesses
      WHERE id = split_part(name, '/', 1)::uuid
    )
  );

-- Only the business owner can delete logos
CREATE POLICY "business-logos: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND auth.uid() IN (
      SELECT owner_id FROM public.businesses
      WHERE id = split_part(name, '/', 1)::uuid
    )
  );
