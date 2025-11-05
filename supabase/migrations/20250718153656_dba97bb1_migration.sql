-- Actualizar servicios con tipos de masajes más realistas de The Nook Madrid
DELETE FROM public.services;

-- Insertar servicios realistas para ambos centros
INSERT INTO public.services (name, description, type, duration_minutes, price_cents, center_id) VALUES 
-- Servicios para el centro de Zurbarán
('Masaje Relajante', 'Masaje completo para liberar tensiones y proporcionar relajación profunda', 'massage', 60, 7000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Deportivo', 'Masaje especializado para deportistas, ideal para recuperación muscular', 'massage', 75, 8500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Terapéutico', 'Tratamiento específico para aliviar dolores musculares y contracturas', 'massage', 90, 9500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje de Espalda', 'Masaje focalizado en la zona de espalda, cuello y hombros', 'massage', 45, 5500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Antiestés', 'Técnica especializada para reducir el estrés y la ansiedad', 'massage', 60, 7500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Drenaje Linfático', 'Masaje suave que ayuda a eliminar toxinas y reduce la retención de líquidos', 'treatment', 60, 8000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Reflexología Podal', 'Tratamiento de relajación a través de puntos de presión en los pies', 'treatment', 45, 6000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),

-- Servicios para el centro de Príncipe de Vergara
('Masaje Relajante', 'Masaje completo para liberar tensiones y proporcionar relajación profunda', 'massage', 60, 7000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Deportivo', 'Masaje especializado para deportistas, ideal para recuperación muscular', 'massage', 75, 8500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Terapéutico', 'Tratamiento específico para aliviar dolores musculares y contracturas', 'massage', 90, 9500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje de Espalda', 'Masaje focalizado en la zona de espalda, cuello y hombros', 'massage', 45, 5500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Antiestés', 'Técnica especializada para reducir el estrés y la ansiedad', 'massage', 60, 7500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Drenaje Linfático', 'Masaje suave que ayuda a eliminar toxinas y reduce la retención de líquidos', 'treatment', 60, 8000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Reflexología Podal', 'Tratamiento de relajación a través de puntos de presión en los pies', 'treatment', 45, 6000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),

-- Servicios premium/paquetes
('Ritual de Bienestar', 'Combinación de masaje relajante y tratamiento facial', 'package', 120, 15000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Ritual de Bienestar', 'Combinación de masaje relajante y tratamiento facial', 'package', 120, 15000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%'));

-- Actualizar los centros con las direcciones reales
UPDATE public.centers SET 
  name = 'The Nook Madrid - Zurbarán',
  address = 'C. de Zurbarán, 10, bajo dcha, Chamberí, 28010 Madrid',
  phone = '+34 910 123 456',
  email = 'zurbaran@thenook.es'
WHERE name LIKE '%Zurbarán%';

UPDATE public.centers SET 
  name = 'The Nook Madrid - Príncipe de Vergara',
  address = 'C. del Príncipe de Vergara, 204 duplicado posterior, local 10, 28002 Madrid',
  phone = '+34 910 123 457',
  email = 'principedevergara@thenook.es'
WHERE name LIKE '%Príncipe de Vergara%';