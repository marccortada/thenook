-- Crear usuario administrador inicial
-- Primero, insertar en auth.users (esto normalmente lo hace Supabase Auth)
-- Para testing, vamos a crear un perfil admin directamente

-- Insertar un perfil admin directamente en la tabla profiles
INSERT INTO public.profiles (
  user_id,
  email, 
  first_name, 
  last_name, 
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@thenookmadrid.com',
  'Administrador',
  'Sistema',
  'admin'
) ON CONFLICT (user_id) DO NOTHING;