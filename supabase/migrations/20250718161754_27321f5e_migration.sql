-- Crear tabla para bonos/paquetes
CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  center_id UUID REFERENCES public.centers(id),
  service_id UUID REFERENCES public.services(id),
  sessions_count INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Crear políticas
CREATE POLICY "Everyone can view packages" 
ON public.packages 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify packages" 
ON public.packages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Crear trigger para actualizar timestamps
CREATE TRIGGER update_packages_updated_at
BEFORE UPDATE ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar algunos bonos de ejemplo
INSERT INTO public.packages (name, description, center_id, service_id, sessions_count, price_cents, discount_percentage) 
SELECT 
  'BONO 5 Sesiones ' || s.name as name,
  'Bono de 5 sesiones con descuento del 12%' as description,
  s.center_id,
  s.id as service_id,
  5 as sessions_count,
  (s.price_cents * 5 * 0.88)::INTEGER as price_cents,
  12 as discount_percentage
FROM public.services s 
WHERE s.type = 'massage' AND s.active = true;

INSERT INTO public.packages (name, description, center_id, service_id, sessions_count, price_cents, discount_percentage) 
SELECT 
  'BONO 10 Sesiones ' || s.name as name,
  'Bono de 10 sesiones con descuento del 15%' as description,
  s.center_id,
  s.id as service_id,
  10 as sessions_count,
  (s.price_cents * 10 * 0.85)::INTEGER as price_cents,
  15 as discount_percentage
FROM public.services s 
WHERE s.type = 'massage' AND s.active = true;