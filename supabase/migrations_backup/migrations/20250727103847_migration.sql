-- Insertar el perfil del nuevo empleado
INSERT INTO public.profiles (email, first_name, last_name, role) 
VALUES ('work@thenookmadrid.com', 'Staff', 'Employee', 'employee')
ON CONFLICT (email) DO UPDATE SET 
  role = 'employee',
  first_name = 'Staff',
  last_name = 'Employee';

-- Actualizar el admin existente si existe
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@thenookmadrid.com';