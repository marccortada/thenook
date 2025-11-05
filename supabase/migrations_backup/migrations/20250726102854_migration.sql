-- Crear usuario administrador inicial
-- Insertar un perfil admin directamente en la tabla profiles
INSERT INTO public.profiles (
  user_id,
  email, 
  first_name, 
  last_name, 
  role
) 
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@thenookmadrid.com',
  'Administrador',
  'Sistema',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE email = 'admin@thenookmadrid.com'
);