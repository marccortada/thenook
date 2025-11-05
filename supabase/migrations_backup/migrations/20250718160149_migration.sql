-- Limpiar usuario administrador existente para permitir nuevo registro
DELETE FROM public.profiles WHERE email = 'admin@thenookmadrid.com';