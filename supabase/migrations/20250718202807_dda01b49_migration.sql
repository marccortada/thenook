-- Crear tabla para códigos internos/etiquetas
CREATE TABLE public.internal_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Color hex para la etiqueta
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  
  -- Metadatos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Índices
  CONSTRAINT check_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Crear índices
CREATE INDEX idx_internal_codes_code ON public.internal_codes(code);
CREATE INDEX idx_internal_codes_category ON public.internal_codes(category);
CREATE INDEX idx_internal_codes_created_by ON public.internal_codes(created_by);

-- Crear tabla para asignación de códigos a entidades
CREATE TABLE public.code_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.internal_codes(id) ON DELETE CASCADE,
  
  -- Entidad a la que se asigna el código (polimórfica)
  entity_type VARCHAR(50) NOT NULL, -- 'booking', 'employee', 'service', 'client'
  entity_id UUID NOT NULL,
  
  -- Metadatos
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  
  -- Restricción de unicidad para evitar duplicados
  UNIQUE(code_id, entity_type, entity_id)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_code_assignments_code_id ON public.code_assignments(code_id);
CREATE INDEX idx_code_assignments_entity ON public.code_assignments(entity_type, entity_id);
CREATE INDEX idx_code_assignments_assigned_by ON public.code_assignments(assigned_by);

-- Habilitar RLS
ALTER TABLE public.internal_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para internal_codes
CREATE POLICY "Staff can view all codes" 
ON public.internal_codes 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Staff can create codes" 
ON public.internal_codes 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
  AND created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Staff can update codes" 
ON public.internal_codes 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  (has_role(auth.uid(), 'employee'::user_role) AND created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "Admins can delete codes" 
ON public.internal_codes 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Políticas RLS para code_assignments
CREATE POLICY "Staff can view all assignments" 
ON public.code_assignments 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Staff can create assignments" 
ON public.code_assignments 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
  AND assigned_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Staff can update assignments" 
ON public.code_assignments 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  (has_role(auth.uid(), 'employee'::user_role) AND assigned_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "Staff can delete assignments" 
ON public.code_assignments 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  (has_role(auth.uid(), 'employee'::user_role) AND assigned_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Trigger para updated_at
CREATE TRIGGER trigger_update_internal_codes_updated_at
  BEFORE UPDATE ON public.internal_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para obtener códigos con estadísticas de uso
CREATE OR REPLACE FUNCTION get_codes_with_stats()
RETURNS TABLE (
  id UUID,
  code VARCHAR(50),
  name VARCHAR(100),
  description TEXT,
  color VARCHAR(7),
  category VARCHAR(50),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  creator_name TEXT,
  usage_count BIGINT,
  last_used TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ic.id,
    ic.code,
    ic.name,
    ic.description,
    ic.color,
    ic.category,
    ic.created_at,
    ic.updated_at,
    ic.created_by,
    CONCAT(p.first_name, ' ', p.last_name) as creator_name,
    COALESCE(COUNT(ca.id), 0) as usage_count,
    MAX(ca.assigned_at) as last_used
  FROM public.internal_codes ic
  LEFT JOIN public.profiles p ON ic.created_by = p.id
  LEFT JOIN public.code_assignments ca ON ic.id = ca.code_id
  GROUP BY ic.id, ic.code, ic.name, ic.description, ic.color, ic.category, 
           ic.created_at, ic.updated_at, ic.created_by, p.first_name, p.last_name
  ORDER BY ic.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener asignaciones de códigos con detalles
CREATE OR REPLACE FUNCTION get_code_assignments_with_details(target_entity_type TEXT DEFAULT NULL, target_entity_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  code_id UUID,
  entity_type VARCHAR(50),
  entity_id UUID,
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  notes TEXT,
  code VARCHAR(50),
  code_name VARCHAR(100),
  code_color VARCHAR(7),
  code_category VARCHAR(50),
  assigner_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.code_id,
    ca.entity_type,
    ca.entity_id,
    ca.assigned_at,
    ca.assigned_by,
    ca.notes,
    ic.code,
    ic.name as code_name,
    ic.color as code_color,
    ic.category as code_category,
    CONCAT(p.first_name, ' ', p.last_name) as assigner_name
  FROM public.code_assignments ca
  JOIN public.internal_codes ic ON ca.code_id = ic.id
  LEFT JOIN public.profiles p ON ca.assigned_by = p.id
  WHERE 
    (target_entity_type IS NULL OR ca.entity_type = target_entity_type)
    AND (target_entity_id IS NULL OR ca.entity_id = target_entity_id)
  ORDER BY ca.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para buscar entidades por códigos
CREATE OR REPLACE FUNCTION search_entities_by_codes(codes VARCHAR(50)[])
RETURNS TABLE (
  entity_type VARCHAR(50),
  entity_id UUID,
  codes_assigned TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.entity_type,
    ca.entity_id,
    ARRAY_AGG(ic.code) as codes_assigned
  FROM public.code_assignments ca
  JOIN public.internal_codes ic ON ca.code_id = ic.id
  WHERE ic.code = ANY(codes)
  GROUP BY ca.entity_type, ca.entity_id
  HAVING COUNT(DISTINCT ic.code) = array_length(codes, 1); -- Solo entidades que tengan TODOS los códigos
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insertar algunos códigos de ejemplo
INSERT INTO public.internal_codes (code, name, description, color, category) VALUES
('PRIORITY', 'Prioritario', 'Reservas o clientes prioritarios', '#EF4444', 'general'),
('VIP', 'Cliente VIP', 'Clientes con tratamiento especial', '#8B5CF6', 'client'),
('TRAINING', 'En formación', 'Empleados en período de entrenamiento', '#F59E0B', 'employee'),
('MAINTENANCE', 'Mantenimiento', 'Servicios que requieren mantenimiento', '#6B7280', 'service'),
('FOLLOW_UP', 'Seguimiento', 'Casos que requieren seguimiento', '#06B6D4', 'general'),
('SEASONAL', 'Estacional', 'Servicios o ofertas estacionales', '#10B981', 'service');