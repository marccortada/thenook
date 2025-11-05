-- Add 4th lane to each center to meet the requirement of 4 horizontal lanes per center

-- Get center IDs first and add the missing lanes
INSERT INTO public.lanes (center_id, name, capacity, active)
SELECT center_id, 'Sala 3', 1, true
FROM public.centers
WHERE id NOT IN (
  SELECT DISTINCT center_id 
  FROM public.lanes 
  WHERE name = 'Sala 3'
);

INSERT INTO public.lanes (center_id, name, capacity, active)
SELECT center_id, 'Sala 4', 1, true
FROM public.centers
WHERE id NOT IN (
  SELECT DISTINCT center_id 
  FROM public.lanes 
  WHERE name = 'Sala 4'
);

-- Ensure we have exactly 4 lanes per center by standardizing names
UPDATE public.lanes SET name = 'Raíl 1' WHERE name IN ('Sala 1');
UPDATE public.lanes SET name = 'Raíl 2' WHERE name IN ('Sala 2');
UPDATE public.lanes SET name = 'Raíl 3' WHERE name IN ('Sala VIP', 'Sala Premium', 'Sala 3');
UPDATE public.lanes SET name = 'Raíl 4' WHERE name = 'Sala 4';

-- Comment: This ensures each center has exactly 4 lanes with consistent naming for the calendar view