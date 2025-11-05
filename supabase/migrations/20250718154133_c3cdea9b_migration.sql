-- Crear un administrador por defecto para The Nook Madrid
-- Primero, insertar un perfil de administrador
INSERT INTO public.profiles (email, first_name, last_name, phone, role) VALUES 
('admin@thenookmadrid.com', 'Administrador', 'The Nook', '+34 910 123 000', 'admin')
ON CONFLICT (email) DO UPDATE SET 
  role = 'admin',
  first_name = 'Administrador',
  last_name = 'The Nook',
  phone = '+34 910 123 000';

-- Insertar algunos empleados de ejemplo
INSERT INTO public.profiles (email, first_name, last_name, phone, role) VALUES 
('maria@thenookmadrid.com', 'María', 'González', '+34 600 111 222', 'employee'),
('carlos@thenookmadrid.com', 'Carlos', 'Martínez', '+34 600 333 444', 'employee'),
('ana@thenookmadrid.com', 'Ana', 'López', '+34 600 555 666', 'employee')
ON CONFLICT (email) DO NOTHING;

-- Crear empleados vinculados a los centros
INSERT INTO public.employees (profile_id, center_id, specialties, active) VALUES 
(
  (SELECT id FROM public.profiles WHERE email = 'maria@thenookmadrid.com'),
  (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%'),
  ARRAY['Masaje Relajante', 'Masaje Terapéutico', 'Drenaje Linfático'],
  true
),
(
  (SELECT id FROM public.profiles WHERE email = 'carlos@thenookmadrid.com'),
  (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%'),
  ARRAY['Masaje Deportivo', 'Masaje Terapéutico'],
  true
),
(
  (SELECT id FROM public.profiles WHERE email = 'ana@thenookmadrid.com'),
  (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%'),
  ARRAY['Masaje Relajante', 'Reflexología Podal', 'Masaje Antiestés'],
  true
)
ON CONFLICT (profile_id, center_id) DO NOTHING;