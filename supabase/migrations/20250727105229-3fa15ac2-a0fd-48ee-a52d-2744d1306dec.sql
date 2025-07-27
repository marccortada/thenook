-- Mejorar el sistema de autenticación para staff
-- Actualizar la tabla profiles para mejor gestión de roles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_staff ON public.profiles(is_staff);

-- Actualizar los perfiles existentes del staff
UPDATE public.profiles 
SET is_staff = true 
WHERE email IN ('admin@thenookmadrid.com', 'work@thenookmadrid.com');

-- Función para manejar el login del staff
CREATE OR REPLACE FUNCTION public.handle_staff_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Actualizar último login solo si es staff
  UPDATE public.profiles 
  SET last_login = now()
  WHERE user_id = NEW.id AND is_staff = true;
  
  RETURN NEW;
END;
$$;

-- Trigger para actualizar último login
DROP TRIGGER IF EXISTS on_auth_staff_login ON auth.users;
CREATE TRIGGER on_auth_staff_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW 
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
  EXECUTE FUNCTION public.handle_staff_login();

-- Función mejorada para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id 
      AND role = _role 
      AND is_staff = true 
      AND is_active = true
  )
$$;

-- Función para verificar si es staff activo
CREATE OR REPLACE FUNCTION public.is_active_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id 
      AND is_staff = true 
      AND is_active = true
  )
$$;