-- Actualizar el rol del usuario admin a administrador
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@thenookmadrid.com';