-- Crear grupos de tratamientos por defecto
INSERT INTO public.treatment_groups (name, color, active) VALUES 
('Masajes', '#3B82F6', true),
('Tratamientos', '#10B981', true),
('Rituales', '#8B5CF6', true);

-- Asignar servicios a grupos basándose en su tipo
UPDATE public.services 
SET group_id = (
  SELECT id FROM public.treatment_groups WHERE name = 'Masajes' LIMIT 1
)
WHERE type = 'massage';

UPDATE public.services 
SET group_id = (
  SELECT id FROM public.treatment_groups WHERE name = 'Tratamientos' LIMIT 1
)
WHERE type = 'treatment';

UPDATE public.services 
SET group_id = (
  SELECT id FROM public.treatment_groups WHERE name = 'Rituales' LIMIT 1
)
WHERE type = 'package';