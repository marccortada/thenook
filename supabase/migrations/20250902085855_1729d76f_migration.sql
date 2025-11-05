-- Remove tables related to intelligent note analysis
DROP TABLE IF EXISTS public.note_analysis CASCADE;
DROP TABLE IF EXISTS public.client_alerts CASCADE;

-- Remove any columns from client_notes table related to AI analysis if they exist
-- (Note: Based on the schema shown, client_notes doesn't have AI-specific columns, so this is just a safety check)