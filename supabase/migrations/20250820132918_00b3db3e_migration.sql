-- Fix the automated_notifications type constraint to include appointment_confirmation
ALTER TABLE public.automated_notifications DROP CONSTRAINT IF EXISTS automated_notifications_type_check;

-- Add the correct constraint that includes both types
ALTER TABLE public.automated_notifications 
ADD CONSTRAINT automated_notifications_type_check 
CHECK (type IN ('appointment_confirmation', 'booking_reminder', 'package_expiry'));