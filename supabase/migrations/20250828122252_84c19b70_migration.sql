-- Borrar todos los datos de clientes actuales para empezar limpio
DELETE FROM public.client_notes;
DELETE FROM public.client_profiles;
DELETE FROM public.loyalty_transactions;
DELETE FROM public.bookings WHERE client_id IS NOT NULL;
DELETE FROM public.profiles WHERE is_staff = false OR is_staff IS NULL;

-- Borrar datos de analytics actuales para empezar a contar desde hoy
DELETE FROM public.business_metrics;
DELETE FROM public.generated_reports;

-- Limpiar notificaciones automáticas antiguas
DELETE FROM public.automated_notifications WHERE scheduled_for < now() - INTERVAL '30 days';

-- Optimizar tablas después de las eliminaciones
VACUUM ANALYZE public.profiles;
VACUUM ANALYZE public.bookings;
VACUUM ANALYZE public.business_metrics;