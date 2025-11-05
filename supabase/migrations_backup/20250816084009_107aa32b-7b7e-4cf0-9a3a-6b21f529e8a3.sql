-- Enable required extensions for scheduling and HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Ensure booking confirmations are enqueued automatically on booking creation
DROP TRIGGER IF EXISTS trg_enqueue_booking_confirmation ON public.bookings;
CREATE TRIGGER trg_enqueue_booking_confirmation
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_booking_confirmation();

-- Create booking reminders scheduled 24 hours before the appointment
CREATE OR REPLACE FUNCTION public.create_booking_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.automated_notifications (type, client_id, booking_id, scheduled_for, subject, message)
  SELECT 
    'booking_reminder',
    b.client_id,
    b.id,
    b.booking_datetime - INTERVAL '24 hours',
    'Recordatorio de tu cita en The Nook Madrid',
    CONCAT(
      'Hola ', p.first_name, '! Te recordamos que tienes una cita mañana a las ', 
      TO_CHAR(b.booking_datetime, 'HH24:MI'), 
      '. ¡Te esperamos!'
    )
  FROM public.bookings b
  JOIN public.profiles p ON b.client_id = p.id
  WHERE b.status = 'confirmed'
    AND b.booking_datetime BETWEEN (now() + INTERVAL '24 hours') AND (now() + INTERVAL '25 hours')
    AND NOT EXISTS (
      SELECT 1 FROM public.automated_notifications an 
      WHERE an.booking_id = b.id 
        AND an.type = 'booking_reminder'
    );
END;
$function$;

-- Schedule: enqueue 24h reminders every hour
SELECT cron.schedule(
  'enqueue-24h-reminders-hourly',
  '0 * * * *',
  $$
  SELECT public.create_booking_reminders();
  $$
);

-- Schedule: process pending automated notifications every 5 minutes
SELECT cron.schedule(
  'send-automated-notifications-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://duedcqgrflmmmxmpdytu.supabase.co/functions/v1/send-booking-confirmation',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZWRjcWdyZmxtbW14bXBkeXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0Njg2NzEsImV4cCI6MjA2ODA0NDY3MX0.o4u-NR2j3gYTkzjPDV3_Iu-Ru75W9KBwgetplEhuU_I"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);