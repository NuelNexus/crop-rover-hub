ALTER TABLE public.marketplace_products
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Storage bucket for marketplace product images
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace', 'marketplace', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view marketplace images"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace');

CREATE POLICY "Anyone can upload marketplace images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marketplace');
