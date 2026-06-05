-- Allow authenticated users to view any profile (display_name only is exposed in UI; no PII like email here)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Storage policies for marketplace bucket so authenticated users can upload product images
DROP POLICY IF EXISTS "Authenticated can upload marketplace images" ON storage.objects;
CREATE POLICY "Authenticated can upload marketplace images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'marketplace');

DROP POLICY IF EXISTS "Anyone can view marketplace images" ON storage.objects;
CREATE POLICY "Anyone can view marketplace images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'marketplace');

DROP POLICY IF EXISTS "Owners can update marketplace images" ON storage.objects;
CREATE POLICY "Owners can update marketplace images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'marketplace' AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners can delete marketplace images" ON storage.objects;
CREATE POLICY "Owners can delete marketplace images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'marketplace' AND owner = auth.uid());

-- Same for crop-cam bucket (used by Identify-Item flow)
DROP POLICY IF EXISTS "Authenticated can upload crop-cam" ON storage.objects;
CREATE POLICY "Authenticated can upload crop-cam"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'crop-cam');

DROP POLICY IF EXISTS "Anyone can view crop-cam" ON storage.objects;
CREATE POLICY "Anyone can view crop-cam"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'crop-cam');