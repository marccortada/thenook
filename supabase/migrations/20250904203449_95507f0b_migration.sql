-- Actualizar el grupo "Masajes" para que tenga asignados los carriles 1 y 2
UPDATE treatment_groups 
SET lane_ids = ARRAY['09197d74-4b00-42db-a3c8-c0b9a10010c9'::uuid, 'ba72d39a-75c9-43c6-b97d-38b65129fad6'::uuid]
WHERE name = 'Masajes';

-- Actualizar la reserva existente del anticelulítico para que vaya al carril 1 (ya que está libre)
UPDATE bookings 
SET lane_id = '09197d74-4b00-42db-a3c8-c0b9a10010c9'
WHERE id = '0d841c54-9c54-49ba-8841-f19a5e2b3dbd';