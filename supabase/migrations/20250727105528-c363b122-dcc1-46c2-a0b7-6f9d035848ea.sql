-- Insertar usuarios del staff en Supabase Auth
-- IMPORTANTE: Las contraseñas se hashearán automáticamente por Supabase
INSERT INTO auth.users 
(id, email, encrypted_password, email_confirmed_at, phone_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
VALUES 
-- Admin
(gen_random_uuid(), 'admin@thenookmadrid.com', crypt('Gnerai123', gen_salt('bf')), now(), NULL, now(), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Admin","last_name":"The Nook"}', false, 'authenticated', 'authenticated'),
-- Employee
(gen_random_uuid(), 'work@thenookmadrid.com', crypt('worker1234', gen_salt('bf')), now(), NULL, now(), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Empleado","last_name":"The Nook"}', false, 'authenticated', 'authenticated')
ON CONFLICT (email) DO NOTHING;

-- Actualizar los perfiles existentes para que coincidan con los usuarios de auth
UPDATE public.profiles 
SET 
  user_id = au.id,
  first_name = COALESCE(au.raw_user_meta_data ->> 'first_name', profiles.first_name),
  last_name = COALESCE(au.raw_user_meta_data ->> 'last_name', profiles.last_name),
  is_staff = true,
  is_active = true
FROM auth.users au
WHERE profiles.email = au.email
  AND profiles.email IN ('admin@thenookmadrid.com', 'work@thenookmadrid.com');