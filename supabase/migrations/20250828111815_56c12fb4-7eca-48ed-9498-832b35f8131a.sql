-- Limpiar datos de empleados y personal
-- Primero eliminar registros de empleados
DELETE FROM public.employees;

-- Eliminar registros de perfiles que sean staff (mantener solo clientes)
DELETE FROM public.profiles WHERE is_staff = true;

-- Eliminar registros de lane_blocks que pudieran estar creados por empleados
DELETE FROM public.lane_blocks;

-- Limpiar cualquier asignación de códigos que pudiera estar hecha por empleados eliminados
DELETE FROM public.code_assignments WHERE assigned_by IS NOT NULL AND assigned_by NOT IN (SELECT id FROM public.profiles);

-- Reiniciar secuencias si las hay para que los IDs empiecen desde 1
-- (No aplica aquí ya que usamos UUIDs)

-- Verificar que las tablas estén vacías pero funcionales
-- Comentario: Las tablas quedarán vacías pero con su estructura intacta