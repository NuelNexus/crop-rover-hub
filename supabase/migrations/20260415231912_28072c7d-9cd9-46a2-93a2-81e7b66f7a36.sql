
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Marketplace orders
CREATE TABLE public.marketplace_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.marketplace_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.marketplace_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own orders" ON public.marketplace_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ESP32 devices
CREATE TABLE public.esp32_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'crop_rover',
  ip_address TEXT,
  api_key TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.esp32_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own devices" ON public.esp32_devices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ESP32 sensor readings
CREATE TABLE public.esp32_sensor_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.esp32_devices(id) ON DELETE CASCADE,
  sensor_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.esp32_sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own device readings" ON public.esp32_sensor_readings FOR SELECT
USING (EXISTS (SELECT 1 FROM public.esp32_devices WHERE id = device_id AND user_id = auth.uid()));

-- Allow ESP32 devices to insert readings via API key (anon role)
CREATE POLICY "Devices can insert readings" ON public.esp32_sensor_readings FOR INSERT WITH CHECK (true);

-- Enable realtime for sensor readings
ALTER PUBLICATION supabase_realtime ADD TABLE public.esp32_sensor_readings;

-- Add user_id to existing tables for ownership
ALTER TABLE public.crops ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.farm_notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.marketplace_products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.harvests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.storage_bins ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.traceability_batches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
