-- Limpiar datos de empleados y personal de forma segura
-- Primero eliminar referencias en bookings a empleados
UPDATE public.bookings SET employee_id = NULL WHERE employee_id IS NOT NULL;

-- Eliminar registros de lane_blocks
DELETE FROM public.lane_blocks;

-- Eliminar registros de empleados
DELETE FROM public.employees;

-- Limpiar asignaciones de códigos hechas por empleados
DELETE FROM public.code_assignments WHERE assigned_by IS NOT NULL;

-- Eliminar perfiles de staff (esto eliminará empleados y admins)
-- NOTA: Esto eliminará todos los usuarios staff, incluyendo admins
DELETE FROM public.profiles WHERE is_staff = true;

-- Las tablas quedarán vacías pero funcionales para crear nuevos empleados