-- Corregir el group_id de los servicios Ritual Sakura para que apunten al grupo Rituales correcto
UPDATE services 
SET group_id = '91e22b98-e3bf-420b-b5e8-a9bf194502fe' 
WHERE name ILIKE '%ritual%sakura%' AND active = true;