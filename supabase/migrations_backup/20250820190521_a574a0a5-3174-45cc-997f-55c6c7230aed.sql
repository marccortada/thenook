-- Fix critical security issues: Restrict public access to sensitive business data

-- 1. CENTERS TABLE - Restrict public access to business locations and contact info
DROP POLICY IF EXISTS "Everyone can view centers" ON public.centers;
CREATE POLICY "Authenticated users can view centers"
ON public.centers
FOR SELECT
USING (auth.role() = 'authenticated');

-- 2. SERVICES TABLE - Restrict public access to service pricing
DROP POLICY IF EXISTS "Everyone can view services" ON public.services;
CREATE POLICY "Authenticated users can view services"
ON public.services
FOR SELECT
USING (auth.role() = 'authenticated');

-- 3. PACKAGES TABLE - Restrict public access to package pricing and discounts
DROP POLICY IF EXISTS "Everyone can view packages" ON public.packages;
CREATE POLICY "Authenticated users can view packages"
ON public.packages
FOR SELECT
USING (auth.role() = 'authenticated');

-- 4. GIFT CARD OPTIONS TABLE - Restrict public access to gift card pricing
DROP POLICY IF EXISTS "Everyone can view active gift card options" ON public.gift_card_options;
CREATE POLICY "Authenticated users can view gift card options"
ON public.gift_card_options
FOR SELECT
USING (auth.role() = 'authenticated' AND is_active = true);

-- 5. LANES TABLE - Restrict public access to facility capacity information
DROP POLICY IF EXISTS "Everyone can view lanes" ON public.lanes;
CREATE POLICY "Authenticated users can view lanes"
ON public.lanes
FOR SELECT
USING (auth.role() = 'authenticated');