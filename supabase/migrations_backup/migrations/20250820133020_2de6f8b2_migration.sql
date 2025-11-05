-- Fix automated_notifications constraint to allow appointment_confirmation type
ALTER TABLE public.automated_notifications DROP CONSTRAINT IF EXISTS automated_notifications_type_check;

ALTER TABLE public.automated_notifications ADD CONSTRAINT automated_notifications_type_check 
CHECK (type IN ('appointment_confirmation', 'booking_reminder', 'package_expiry'));