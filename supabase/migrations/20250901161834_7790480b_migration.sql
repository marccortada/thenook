-- Cambiar el sistema de descuentos de porcentaje a precio fijo
ALTER TABLE public.services 
DROP COLUMN discount_percentage,
ADD COLUMN discount_price_cents integer DEFAULT 0;