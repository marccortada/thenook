-- Add working_hours column to centers table
ALTER TABLE public.centers 
ADD COLUMN working_hours JSONB DEFAULT '{
  "monday": {"enabled": true, "start": "09:00", "end": "18:00"},
  "tuesday": {"enabled": true, "start": "09:00", "end": "18:00"}, 
  "wednesday": {"enabled": true, "start": "09:00", "end": "18:00"},
  "thursday": {"enabled": true, "start": "09:00", "end": "18:00"},
  "friday": {"enabled": true, "start": "09:00", "end": "18:00"},
  "saturday": {"enabled": true, "start": "10:00", "end": "16:00"},
  "sunday": {"enabled": false, "start": "10:00", "end": "16:00"}
}'::jsonb;