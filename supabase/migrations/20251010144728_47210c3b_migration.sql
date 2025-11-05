-- Crear tabla package_services para asociar servicios con paquetes
CREATE TABLE IF NOT EXISTS public.package_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(package_id, service_id)
);

-- Habilitar RLS en la tabla package_services
ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para package_services
CREATE POLICY "Staff can view package services"
  ON public.package_services
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'employee'::user_role)
  );

CREATE POLICY "Staff can insert package services"
  ON public.package_services
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'employee'::user_role)
  );

CREATE POLICY "Staff can update package services"
  ON public.package_services
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'employee'::user_role)
  );

CREATE POLICY "Staff can delete package services"
  ON public.package_services
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'employee'::user_role)
  );

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_package_services_package_id ON public.package_services(package_id);
CREATE INDEX IF NOT EXISTS idx_package_services_service_id ON public.package_services(service_id);