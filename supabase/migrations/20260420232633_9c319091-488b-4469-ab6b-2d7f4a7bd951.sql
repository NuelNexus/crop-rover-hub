
CREATE TABLE public.esp32_camera_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.esp32_devices(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  ai_analysis TEXT,
  detected_issue TEXT,
  severity TEXT NOT NULL DEFAULT 'low',
  location TEXT,
  analyzed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.esp32_camera_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devices can insert captures"
ON public.esp32_camera_captures FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users view own device captures"
ON public.esp32_camera_captures FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.esp32_devices
  WHERE esp32_devices.id = esp32_camera_captures.device_id
    AND esp32_devices.user_id = auth.uid()
));

CREATE POLICY "Users update own device captures"
ON public.esp32_camera_captures FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.esp32_devices
  WHERE esp32_devices.id = esp32_camera_captures.device_id
    AND esp32_devices.user_id = auth.uid()
));

CREATE POLICY "Users delete own device captures"
ON public.esp32_camera_captures FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.esp32_devices
  WHERE esp32_devices.id = esp32_camera_captures.device_id
    AND esp32_devices.user_id = auth.uid()
));

CREATE INDEX idx_camera_captures_device ON public.esp32_camera_captures(device_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.esp32_camera_captures;

-- Storage bucket for cam images
INSERT INTO storage.buckets (id, name, public) VALUES ('crop-cam', 'crop-cam', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view cam images"
ON storage.objects FOR SELECT
USING (bucket_id = 'crop-cam');

CREATE POLICY "Anyone can upload cam images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'crop-cam');
