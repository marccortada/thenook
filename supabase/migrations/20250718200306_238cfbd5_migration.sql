-- Crear tabla para trackear bonos/paquetes comprados por clientes
CREATE TABLE public.client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  
  -- Información de compra
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ NOT NULL,
  purchase_price_cents INTEGER NOT NULL,
  
  -- Control de uso
  total_sessions INTEGER NOT NULL,
  used_sessions INTEGER NOT NULL DEFAULT 0,
  
  -- Estado del bono
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used_up', 'cancelled')),
  
  -- Código único para identificar el bono
  voucher_code TEXT NOT NULL UNIQUE,
  
  -- Metadatos
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Restricciones
  CONSTRAINT remaining_sessions_valid CHECK (used_sessions <= total_sessions)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_client_packages_client_id ON public.client_packages(client_id);
CREATE INDEX idx_client_packages_status ON public.client_packages(status);
CREATE INDEX idx_client_packages_expiry ON public.client_packages(expiry_date);
CREATE INDEX idx_client_packages_voucher_code ON public.client_packages(voucher_code);

-- Habilitar Row Level Security
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own packages" 
ON public.client_packages 
FOR SELECT 
USING (client_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Staff can view all packages" 
ON public.client_packages 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Staff can create packages" 
ON public.client_packages 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'employee'::user_role)
);

CREATE POLICY "Staff can update packages" 
ON public.client_packages 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'employee'::user_role)
);

-- Función para generar código único de voucher
CREATE OR REPLACE FUNCTION generate_voucher_code() RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generar código de 8 caracteres alfanuméricos
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Verificar si ya existe
    SELECT COUNT(*) INTO exists_check 
    FROM public.client_packages 
    WHERE voucher_code = code;
    
    -- Si no existe, salir del loop
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar el estado del bono automáticamente
CREATE OR REPLACE FUNCTION update_client_package_status() RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar estado basado en uso y fecha
  IF NEW.used_sessions >= NEW.total_sessions THEN
    NEW.status := 'used_up';
  ELSIF NEW.expiry_date < now() THEN
    NEW.status := 'expired';
  ELSIF NEW.status NOT IN ('cancelled') THEN
    NEW.status := 'active';
  END IF;
  
  -- Actualizar timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estado automáticamente
CREATE TRIGGER trigger_update_client_package_status
  BEFORE INSERT OR UPDATE ON public.client_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_client_package_status();

-- Función para usar una sesión del bono
CREATE OR REPLACE FUNCTION use_client_package_session(
  package_id UUID,
  booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  client_package RECORD;
  success BOOLEAN := FALSE;
BEGIN
  -- Obtener el bono y bloquearlo
  SELECT * INTO client_package 
  FROM public.client_packages 
  WHERE id = package_id 
  AND status = 'active'
  AND used_sessions < total_sessions
  AND expiry_date > now()
  FOR UPDATE;
  
  IF FOUND THEN
    -- Incrementar sesiones usadas
    UPDATE public.client_packages 
    SET used_sessions = used_sessions + 1,
        updated_at = now()
    WHERE id = package_id;
    
    -- Si se proporciona booking_id, actualizar la reserva
    IF booking_id IS NOT NULL THEN
      UPDATE public.bookings 
      SET notes = COALESCE(notes, '') || ' | Bono usado: ' || client_package.voucher_code
      WHERE id = booking_id;
    END IF;
    
    success := TRUE;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener bonos próximos a vencer (para alertas)
CREATE OR REPLACE FUNCTION get_expiring_packages(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  package_name TEXT,
  voucher_code TEXT,
  expiry_date TIMESTAMPTZ,
  remaining_sessions INTEGER,
  days_to_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.client_id,
    CONCAT(p.first_name, ' ', p.last_name) as client_name,
    p.email as client_email,
    pkg.name as package_name,
    cp.voucher_code,
    cp.expiry_date,
    (cp.total_sessions - cp.used_sessions) as remaining_sessions,
    EXTRACT(DAY FROM cp.expiry_date - now())::INTEGER as days_to_expiry
  FROM public.client_packages cp
  JOIN public.profiles p ON cp.client_id = p.id
  JOIN public.packages pkg ON cp.package_id = pkg.id
  WHERE cp.status = 'active'
    AND cp.expiry_date BETWEEN now() AND (now() + INTERVAL '1 day' * days_ahead)
    AND cp.used_sessions < cp.total_sessions
  ORDER BY cp.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;