-- Limpiar datos de empleados y personal de forma segura
-- Primero eliminar lane_blocks que requieren created_by
DELETE FROM public.lane_blocks;

-- Quitar las referencias de empleados en las reservas
UPDATE public.bookings SET employee_id = NULL WHERE employee_id IS NOT NULL;

-- Eliminar registros de empleados
DELETE FROM public.employees;

-- Antes de eliminar profiles staff, limpiar referencias que permiten NULL
UPDATE public.client_notes SET staff_id = NULL WHERE staff_id IS NOT NULL;
UPDATE public.code_assignments SET assigned_by = NULL WHERE assigned_by IS NOT NULL;
UPDATE public.generated_reports SET generated_by = NULL WHERE generated_by IS NOT NULL;
UPDATE public.report_templates SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE public.client_package_usages SET used_by = NULL WHERE used_by IS NOT NULL;
UPDATE public.inventory_movements SET performed_by = NULL WHERE performed_by IS NOT NULL;
UPDATE public.purchase_orders SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE public.promotions SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE public.kpi_targets SET created_by = NULL WHERE created_by IS NOT NULL;

-- Ahora eliminar los perfiles de staff
DELETE FROM public.profiles WHERE is_staff = true;

-- Comentario: Personal completamente eliminado, tablas funcionales pero vacías