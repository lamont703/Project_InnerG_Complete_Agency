-- Migration 130: Fix Crypto Intelligence RLS Policies
-- Grants proper access to the Intelligence Engine tables for admins and authorized systems.

-- 1. Policies for crypto_intelligence_config
DROP POLICY IF EXISTS "Admins can manage crypto configs" ON public.crypto_intelligence_config;
CREATE POLICY "Admins can manage crypto configs" 
ON public.crypto_intelligence_config 
FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' OR role = 'developer'));

-- 2. Policies for crypto_signals
DROP POLICY IF EXISTS "Admins can manage crypto signals" ON public.crypto_signals;
CREATE POLICY "Admins can manage crypto signals" 
ON public.crypto_signals 
FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' OR role = 'developer'));

DROP POLICY IF EXISTS "Projects can view their own signals" ON public.crypto_signals;
CREATE POLICY "Projects can view their own signals" 
ON public.crypto_signals 
FOR SELECT 
USING (true); -- Public signals based on project visibility logic

-- 3. Policies for crypto_market_bias (Global Read, Admin Write)
DROP POLICY IF EXISTS "Admins can manage market bias" ON public.crypto_market_bias;
CREATE POLICY "Admins can manage market bias" 
ON public.crypto_market_bias 
FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' OR role = 'developer'));

DROP POLICY IF EXISTS "Everyone can view market bias" ON public.crypto_market_bias;
CREATE POLICY "Everyone can view market bias" 
ON public.crypto_market_bias 
FOR SELECT 
USING (true);

-- 4. Policies for crypto_zones
DROP POLICY IF EXISTS "Admins can manage zones" ON public.crypto_zones;
CREATE POLICY "Admins can manage zones" 
ON public.crypto_zones 
FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' OR role = 'developer'));

DROP POLICY IF EXISTS "Everyone can view zones" ON public.crypto_zones;
CREATE POLICY "Everyone can view zones" 
ON public.crypto_zones 
FOR SELECT 
USING (true);
