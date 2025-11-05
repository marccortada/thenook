-- Actualizar servicios con los masajes y rituales reales de The Nook Madrid
DELETE FROM public.services;

-- Insertar todos los masajes y rituales reales para ambos centros
INSERT INTO public.services (name, description, type, duration_minutes, price_cents, center_id) VALUES 

-- MASAJES para centro Zurbarán
('Masaje Relajante', 'Masaje completo para liberar tensiones y proporcionar relajación profunda', 'massage', 60, 7000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Deportivo', 'Masaje especializado para deportistas, ideal para recuperación muscular', 'massage', 90, 9000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Terapéutico', 'Tratamiento específico para aliviar dolores musculares y contracturas', 'massage', 90, 9500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Descontracturante', 'Masaje intensivo para eliminar contracturas y tensiones profundas', 'massage', 75, 8500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Antiestrés TheNook', 'Técnica especializada de The Nook para reducir el estrés y la ansiedad', 'massage', 60, 7500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Shiatsu', 'Técnica japonesa de masaje con presión digital para equilibrar la energía', 'massage', 75, 8500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje con Piedras Calientes', 'Masaje relajante con piedras volcánicas calientes para aliviar tensiones', 'massage', 90, 10000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje con Cañas de Bambú', 'Masaje único con cañas de bambú para relajación profunda', 'massage', 75, 8800, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje para Embarazadas', 'Masaje especializado para mujeres embarazadas, seguro y relajante', 'massage', 60, 7200, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje para 2 Personas', 'Masaje simultáneo para parejas en la misma sala', 'massage', 60, 14000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Piernas Cansadas', 'Masaje específico para aliviar la pesadez y cansancio de piernas', 'massage', 45, 5500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje a Cuatro Manos', 'Masaje realizado por dos terapeutas simultáneamente', 'massage', 60, 12000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),

-- TRATAMIENTOS para centro Zurbarán
('Drenaje Linfático', 'Masaje suave que ayuda a eliminar toxinas y reduce la retención de líquidos', 'treatment', 75, 8500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Reflexología Podal', 'Tratamiento de relajación a través de puntos de presión en los pies', 'treatment', 45, 6000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Anticelulítico / Reductor', 'Tratamiento especializado para reducir celulitis y medidas corporales', 'treatment', 90, 9500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),

-- RITUALES para centro Zurbarán
('Ritual Sakura', 'Ritual inspirado en la belleza de la flor de cerezo japonesa', 'package', 120, 15000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Ritual Kobido', 'Ritual facial japonés tradicional para rejuvenecer y tonificar', 'package', 90, 12000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Ritual Energizante', 'Ritual revitalizante que combina masaje y aromaterapia', 'package', 105, 13500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Ritual Romántico de Esencias Florales', 'Ritual para parejas con aceites esenciales y pétalos de flores', 'package', 120, 18000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Ritual Beauty (Facial y corporal)', 'Ritual completo que combina tratamiento facial y corporal', 'package', 150, 20000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),

-- MASAJES para centro Príncipe de Vergara
('Masaje Relajante', 'Masaje completo para liberar tensiones y proporcionar relajación profunda', 'massage', 60, 7000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Deportivo', 'Masaje especializado para deportistas, ideal para recuperación muscular', 'massage', 90, 9000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Terapéutico', 'Tratamiento específico para aliviar dolores musculares y contracturas', 'massage', 90, 9500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Descontracturante', 'Masaje intensivo para eliminar contracturas y tensiones profundas', 'massage', 75, 8500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Antiestrés TheNook', 'Técnica especializada de The Nook para reducir el estrés y la ansiedad', 'massage', 60, 7500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Shiatsu', 'Técnica japonesa de masaje con presión digital para equilibrar la energía', 'massage', 75, 8500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje con Piedras Calientes', 'Masaje relajante con piedras volcánicas calientes para aliviar tensiones', 'massage', 90, 10000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje con Cañas de Bambú', 'Masaje único con cañas de bambú para relajación profunda', 'massage', 75, 8800, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje para Embarazadas', 'Masaje especializado para mujeres embarazadas, seguro y relajante', 'massage', 60, 7200, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje para 2 Personas', 'Masaje simultáneo para parejas en la misma sala', 'massage', 60, 14000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Piernas Cansadas', 'Masaje específico para aliviar la pesadez y cansancio de piernas', 'massage', 45, 5500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje a Cuatro Manos', 'Masaje realizado por dos terapeutas simultáneamente', 'massage', 60, 12000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),

-- TRATAMIENTOS para centro Príncipe de Vergara
('Drenaje Linfático', 'Masaje suave que ayuda a eliminar toxinas y reduce la retención de líquidos', 'treatment', 75, 8500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Reflexología Podal', 'Tratamiento de relajación a través de puntos de presión en los pies', 'treatment', 45, 6000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Anticelulítico / Reductor', 'Tratamiento especializado para reducir celulitis y medidas corporales', 'treatment', 90, 9500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),

-- RITUALES para centro Príncipe de Vergara
('Ritual Sakura', 'Ritual inspirado en la belleza de la flor de cerezo japonesa', 'package', 120, 15000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Ritual Kobido', 'Ritual facial japonés tradicional para rejuvenecer y tonificar', 'package', 90, 12000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Ritual Energizante', 'Ritual revitalizante que combina masaje y aromaterapia', 'package', 105, 13500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Ritual Romántico de Esencias Florales', 'Ritual para parejas con aceites esenciales y pétalos de flores', 'package', 120, 18000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Ritual Beauty (Facial y corporal)', 'Ritual completo que combina tratamiento facial y corporal', 'package', 150, 20000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%'));

-- Actualizar especialidades de los empleados con los nuevos servicios
UPDATE public.employees SET specialties = ARRAY['Masaje Relajante', 'Masaje Antiestrés TheNook', 'Drenaje Linfático', 'Ritual Sakura'] WHERE profile_id = (SELECT id FROM public.profiles WHERE email = 'maria@thenookmadrid.com');

UPDATE public.employees SET specialties = ARRAY['Masaje Deportivo', 'Masaje Descontracturante', 'Masaje con Piedras Calientes'] WHERE profile_id = (SELECT id FROM public.profiles WHERE email = 'carlos@thenookmadrid.com');

UPDATE public.employees SET specialties = ARRAY['Masaje Shiatsu', 'Reflexología Podal', 'Ritual Kobido', 'Masaje para Embarazadas'] WHERE profile_id = (SELECT id FROM public.profiles WHERE email = 'ana@thenookmadrid.com');