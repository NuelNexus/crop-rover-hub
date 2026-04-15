
-- Drop old permissive policies
DROP POLICY IF EXISTS "Public access" ON public.crops;
DROP POLICY IF EXISTS "Public access" ON public.farm_notes;
DROP POLICY IF EXISTS "Public access" ON public.financial_records;
DROP POLICY IF EXISTS "Public access" ON public.harvests;
DROP POLICY IF EXISTS "Public access" ON public.alerts;
DROP POLICY IF EXISTS "Public access" ON public.storage_bins;
DROP POLICY IF EXISTS "Public access" ON public.marketplace_products;
DROP POLICY IF EXISTS "Public access" ON public.traceability_batches;
DROP POLICY IF EXISTS "Public access" ON public.traceability_steps;

-- Crops: user-scoped
CREATE POLICY "Users manage own crops" ON public.crops FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Farm notes: user-scoped
CREATE POLICY "Users manage own notes" ON public.farm_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Financial records: user-scoped
CREATE POLICY "Users manage own financials" ON public.financial_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Harvests: user-scoped
CREATE POLICY "Users manage own harvests" ON public.harvests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alerts: user-scoped
CREATE POLICY "Users manage own alerts" ON public.alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bins: user-scoped
CREATE POLICY "Users manage own storage" ON public.storage_bins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Marketplace: public read, owner manage
CREATE POLICY "Anyone can view products" ON public.marketplace_products FOR SELECT USING (true);
CREATE POLICY "Users manage own products" ON public.marketplace_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own products" ON public.marketplace_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own products" ON public.marketplace_products FOR DELETE USING (auth.uid() = user_id);

-- Traceability batches: user-scoped
CREATE POLICY "Users manage own batches" ON public.traceability_batches FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Traceability steps: accessible if user owns parent batch
CREATE POLICY "Users manage own batch steps" ON public.traceability_steps FOR ALL
USING (EXISTS (SELECT 1 FROM public.traceability_batches WHERE id = batch_id AND user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.traceability_batches WHERE id = batch_id AND user_id = auth.uid()));
