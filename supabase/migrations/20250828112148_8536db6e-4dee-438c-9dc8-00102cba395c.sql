-- Eliminar todas las tablas y funciones relacionadas con análisis inteligente

-- Eliminar tablas de análisis de notas
DROP TABLE IF EXISTS public.note_analysis CASCADE;
DROP TABLE IF EXISTS public.note_analysis_queue CASCADE;
DROP TABLE IF EXISTS public.client_alerts CASCADE;

-- Eliminar funciones relacionadas con análisis
DROP FUNCTION IF EXISTS public.get_analysis_stats(integer);
DROP FUNCTION IF EXISTS public.get_client_notes_with_details(uuid, text, text, integer);
DROP FUNCTION IF EXISTS public.get_active_client_alerts();
DROP FUNCTION IF EXISTS public.toggle_note_alert(uuid, boolean);
DROP FUNCTION IF EXISTS public.queue_note_for_analysis();

-- Eliminar triggers relacionados con análisis
DROP TRIGGER IF EXISTS queue_note_analysis_trigger ON public.client_notes;

-- Eliminar edge function relacionada con análisis (solo referencia)
-- NOTA: La edge function analyze-client-notes será eliminada del código