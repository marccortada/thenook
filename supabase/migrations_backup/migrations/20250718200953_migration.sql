-- Crear tabla para notas de clientes
CREATE TABLE public.client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Contenido de la nota
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Categorización
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
    'general', 'preferences', 'medical', 'allergies', 'behavior', 
    'payment', 'complaints', 'compliments', 'follow_up'
  )),
  
  -- Prioridad y visibilidad
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_alert BOOLEAN NOT NULL DEFAULT false, -- Mostrar como alerta al staff
  
  -- Metadatos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Índices para búsqueda
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('spanish', title || ' ' || content)
  ) STORED
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_client_notes_client_id ON public.client_notes(client_id);
CREATE INDEX idx_client_notes_staff_id ON public.client_notes(staff_id);
CREATE INDEX idx_client_notes_category ON public.client_notes(category);
CREATE INDEX idx_client_notes_priority ON public.client_notes(priority);
CREATE INDEX idx_client_notes_is_alert ON public.client_notes(is_alert);
CREATE INDEX idx_client_notes_created_at ON public.client_notes(created_at DESC);
CREATE INDEX idx_client_notes_search ON public.client_notes USING GIN(search_vector);

-- Habilitar Row Level Security
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Solo staff puede ver/gestionar notas
CREATE POLICY "Staff can view all notes" 
ON public.client_notes 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Staff can create notes" 
ON public.client_notes 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
  AND staff_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Staff can update their own notes" 
ON public.client_notes 
FOR UPDATE 
USING (
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
  AND (staff_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::user_role))
);

CREATE POLICY "Admins can delete notes" 
ON public.client_notes 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_client_notes_updated_at
  BEFORE UPDATE ON public.client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para obtener notas con información del staff y cliente
CREATE OR REPLACE FUNCTION get_client_notes_with_details(
  target_client_id UUID DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  staff_id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  priority TEXT,
  is_private BOOLEAN,
  is_alert BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  client_name TEXT,
  client_email TEXT,
  staff_name TEXT,
  staff_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cn.id,
    cn.client_id,
    cn.staff_id,
    cn.title,
    cn.content,
    cn.category,
    cn.priority,
    cn.is_private,
    cn.is_alert,
    cn.created_at,
    cn.updated_at,
    CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
    cp.email as client_email,
    CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
    sp.email as staff_email
  FROM public.client_notes cn
  JOIN public.profiles cp ON cn.client_id = cp.id
  JOIN public.profiles sp ON cn.staff_id = sp.id
  WHERE 
    (target_client_id IS NULL OR cn.client_id = target_client_id)
    AND (category_filter IS NULL OR cn.category = category_filter)
    AND (search_query IS NULL OR cn.search_vector @@ plainto_tsquery('spanish', search_query))
  ORDER BY 
    CASE WHEN cn.is_alert THEN 1 ELSE 2 END,
    CASE cn.priority 
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    cn.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener alertas activas
CREATE OR REPLACE FUNCTION get_active_client_alerts()
RETURNS TABLE (
  id UUID,
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  title TEXT,
  content TEXT,
  category TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ,
  staff_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cn.id,
    cn.client_id,
    CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
    cp.email as client_email,
    cn.title,
    cn.content,
    cn.category,
    cn.priority,
    cn.created_at,
    CONCAT(sp.first_name, ' ', sp.last_name) as staff_name
  FROM public.client_notes cn
  JOIN public.profiles cp ON cn.client_id = cp.id
  JOIN public.profiles sp ON cn.staff_id = sp.id
  WHERE cn.is_alert = true
  ORDER BY 
    CASE cn.priority 
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    cn.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar/desmarcar alertas
CREATE OR REPLACE FUNCTION toggle_note_alert(note_id UUID, is_alert_value BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE public.client_notes 
  SET is_alert = is_alert_value, updated_at = now()
  WHERE id = note_id;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;