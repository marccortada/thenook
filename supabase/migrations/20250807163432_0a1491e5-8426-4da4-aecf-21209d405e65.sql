-- Fix: Add 4 lanes per center ensuring we have exactly 4 horizontal lanes per center

-- First, get all center IDs and insert missing lanes
WITH centers_with_lane_count AS (
  SELECT c.id as center_id, COALESCE(COUNT(l.id), 0) as lane_count
  FROM centers c
  LEFT JOIN lanes l ON c.id = l.center_id AND l.active = true
  GROUP BY c.id
)
INSERT INTO public.lanes (center_id, name, capacity, active)
SELECT 
  center_id,
  CASE 
    WHEN lane_count < 1 THEN 'Raíl 1'
    WHEN lane_count < 2 THEN 'Raíl 2'  
    WHEN lane_count < 3 THEN 'Raíl 3'
    WHEN lane_count < 4 THEN 'Raíl 4'
  END as name,
  1 as capacity,
  true as active
FROM centers_with_lane_count
WHERE lane_count < 4;

-- Standardize existing lane names to ensure consistency
UPDATE public.lanes SET name = 'Raíl 1' WHERE name ILIKE '%sala 1%' OR name ILIKE '%sala%1%';
UPDATE public.lanes SET name = 'Raíl 2' WHERE name ILIKE '%sala 2%' OR name ILIKE '%sala%2%';
UPDATE public.lanes SET name = 'Raíl 3' WHERE name ILIKE '%vip%' OR name ILIKE '%premium%' OR name ILIKE '%sala 3%';
UPDATE public.lanes SET name = 'Raíl 4' WHERE name ILIKE '%sala 4%';