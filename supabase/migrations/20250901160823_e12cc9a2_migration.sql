-- Agregar campos de descuento a la tabla services
ALTER TABLE public.services 
ADD COLUMN discount_percentage integer DEFAULT 0,
ADD COLUMN has_discount boolean DEFAULT false;