-- Actualizar el perfil existente para work@thenookmadrid.com
UPDATE profiles 
SET role = 'employee', is_staff = true, is_active = true 
WHERE email = 'work@thenookmadrid.com';