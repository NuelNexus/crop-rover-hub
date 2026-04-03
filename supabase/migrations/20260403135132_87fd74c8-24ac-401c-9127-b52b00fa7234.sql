-- Create crops table
CREATE TABLE public.crops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Seed Started',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  category TEXT NOT NULL DEFAULT 'Grains',
  field_location TEXT,
  planted_date DATE,
  expected_harvest DATE,
  yield_amount NUMERIC,
  yield_unit TEXT DEFAULT 'Tons',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marketplace_products table
CREATE TABLE public.marketplace_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  price_unit TEXT NOT NULL DEFAULT 'ton',
  seller TEXT NOT NULL,
  rating NUMERIC DEFAULT 0,
  stock_status TEXT NOT NULL DEFAULT 'In Stock',
  category TEXT DEFAULT 'Produce',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage_bins table
CREATE TABLE public.storage_bins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bin_name TEXT NOT NULL,
  crop_stored TEXT NOT NULL,
  temperature NUMERIC NOT NULL DEFAULT 20,
  humidity NUMERIC NOT NULL DEFAULT 50,
  fill_percentage INTEGER NOT NULL DEFAULT 0 CHECK (fill_percentage >= 0 AND fill_percentage <= 100),
  spoilage_risk TEXT NOT NULL DEFAULT 'Low',
  status TEXT NOT NULL DEFAULT 'Good',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create farm_notes table
CREATE TABLE public.farm_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('high', 'medium', 'low')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create traceability_batches table
CREATE TABLE public.traceability_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  batch_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create traceability_steps table
CREATE TABLE public.traceability_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.traceability_batches(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  step_date TEXT NOT NULL,
  location TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create harvests table
CREATE TABLE public.harvests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_name TEXT NOT NULL,
  field TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'Tons',
  harvest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quality_grade TEXT DEFAULT 'A',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial_records table
CREATE TABLE public.financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traceability_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traceability_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for now)
CREATE POLICY "Public access" ON public.crops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.marketplace_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.storage_bins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.farm_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.traceability_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.traceability_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.harvests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.financial_records FOR ALL USING (true) WITH CHECK (true);

-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_crops_updated_at BEFORE UPDATE ON public.crops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketplace_products_updated_at BEFORE UPDATE ON public.marketplace_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_storage_bins_updated_at BEFORE UPDATE ON public.storage_bins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();