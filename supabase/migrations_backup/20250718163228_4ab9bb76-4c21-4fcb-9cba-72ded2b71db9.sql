-- Limpiar reservas de prueba
DELETE FROM public.bookings;

-- Limpiar perfiles de clientes temporales (que no sean el admin)
DELETE FROM public.profiles 
WHERE role = 'client' AND email LIKE '%@temp.com';

-- Reiniciar secuencias si es necesario
-- Las UUIDs no necesitan reinicio de secuencias