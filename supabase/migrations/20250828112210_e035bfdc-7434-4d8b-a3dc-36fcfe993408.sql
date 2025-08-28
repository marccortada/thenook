-- Eliminar todas las tablas y funciones relacionadas con análisis inteligente
-- Primero eliminar triggers

DROP TRIGGER IF EXISTS trigger_queue_note_analysis ON public.client_notes;

-- Ahora eliminar funciones
DROP FUNCTION IF EXISTS public.queue_note_for_analysis() CASCADE;
DROP FUNCTION IF EXISTS public.get_analysis_stats(integer);
DROP FUNCTION IF EXISTS public.get_client_notes_with_details(uuid, text, text, integer);
DROP FUNCTION IF EXISTS public.get_active_client_alerts();
DROP FUNCTION IF EXISTS public.toggle_note_alert(uuid, boolean);

-- Eliminar tablas de análisis de notas
DROP TABLE IF EXISTS public.note_analysis CASCADE;
DROP TABLE IF EXISTS public.note_analysis_queue CASCADE;
DROP TABLE IF EXISTS public.client_alerts CASCADE;