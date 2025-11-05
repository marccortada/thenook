-- Revisión de seguridad: Arreglar políticas RLS y funciones inseguras

-- 1. ARREGLAR POLÍTICAS RLS DEMASIADO PERMISIVAS
-- Eliminar políticas temporales con 'true' que son inseguras

-- Profiles: Arreglar políticas demasiado permisivas
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;

-- Crear políticas más seguras para profiles
CREATE POLICY "Secure admin profile creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  -- Solo permitir si es admin autenticado o trigger del sistema
  auth.uid() IS NULL OR has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Secure profile viewing" 
ON public.profiles 
FOR SELECT 
USING (
  -- Los usuarios ven su perfil O staff ve todos
  (user_id = auth.uid()) OR 
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'employee'::user_role)
);

-- Crear políticas más seguras para employees
CREATE POLICY "Secure employee management" 
ON public.employees 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- 2. ARREGLAR FUNCIONES SIN SEARCH_PATH FIJO (problemas de seguridad)

-- Arreglar función has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

-- Arreglar función update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Arreglar función generate_voucher_code
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    SELECT COUNT(*) INTO exists_check 
    FROM public.client_packages 
    WHERE voucher_code = code;
    
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN code;
END;
$function$;

-- Arreglar función update_client_package_status
CREATE OR REPLACE FUNCTION public.update_client_package_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.used_sessions >= NEW.total_sessions THEN
    NEW.status := 'used_up';
  ELSIF NEW.expiry_date < now() THEN
    NEW.status := 'expired';
  ELSIF NEW.status NOT IN ('cancelled') THEN
    NEW.status := 'active';
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- Arreglar función use_client_package_session
CREATE OR REPLACE FUNCTION public.use_client_package_session(package_id uuid, booking_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  client_package RECORD;
  success BOOLEAN := FALSE;
BEGIN
  SELECT * INTO client_package 
  FROM public.client_packages 
  WHERE id = package_id 
  AND status = 'active'
  AND used_sessions < total_sessions
  AND expiry_date > now()
  FOR UPDATE;
  
  IF FOUND THEN
    UPDATE public.client_packages 
    SET used_sessions = used_sessions + 1,
        updated_at = now()
    WHERE id = package_id;
    
    IF booking_id IS NOT NULL THEN
      UPDATE public.bookings 
      SET notes = COALESCE(notes, '') || ' | Bono usado: ' || client_package.voucher_code
      WHERE id = booking_id;
    END IF;
    
    success := TRUE;
  END IF;
  
  RETURN success;
END;
$function$;

-- 3. AGREGAR POLÍTICAS DE SEGURIDAD FALTANTES PARA TABLAS CRÍTICAS

-- Asegurar que client_notes tiene políticas restrictivas adecuadas
-- (ya están bien definidas)

-- Asegurar que bookings tiene políticas restrictivas adecuadas
-- (ya están bien definidas)

-- 4. CREAR FUNCIÓN PARA VALIDAR ROLES DE SEGURIDAD
CREATE OR REPLACE FUNCTION public.validate_user_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT public.has_role(auth.uid(), required_role)
$function$;