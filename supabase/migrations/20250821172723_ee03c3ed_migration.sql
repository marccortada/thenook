-- Relax RLS to allow public readonly access for active public catalog data
-- 1) CENTERS
DROP POLICY IF EXISTS "Authenticated users can view centers" ON public.centers;
CREATE POLICY "Public can view active centers"
ON public.centers
FOR SELECT
USING (active = true);

-- 2) SERVICES
DROP POLICY IF EXISTS "Authenticated users can view services" ON public.services;
CREATE POLICY "Public can view active services"
ON public.services
FOR SELECT
USING (active = true);

-- 3) PACKAGES
DROP POLICY IF EXISTS "Authenticated users can view packages" ON public.packages;
CREATE POLICY "Public can view active packages"
ON public.packages
FOR SELECT
USING (active = true);

-- 4) GIFT CARD OPTIONS
DROP POLICY IF EXISTS "Authenticated users can view gift card options" ON public.gift_card_options;
CREATE POLICY "Public can view active gift card options"
ON public.gift_card_options
FOR SELECT
USING (is_active = true);

-- 5) LANES
DROP POLICY IF EXISTS "Authenticated users can view lanes" ON public.lanes;
CREATE POLICY "Public can view active lanes"
ON public.lanes
FOR SELECT
USING (active = true);

-- Keep existing modify policies (admins/employees) as-is.
