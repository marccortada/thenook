-- Ajustar recordatorios de reservas a 26h y 1h antes del tratamiento
CREATE OR REPLACE FUNCTION public.create_booking_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_now timestamptz := now();
BEGIN
  -- Recordatorio 26 horas antes
  INSERT INTO public.automated_notifications (
    type,
    client_id,
    booking_id,
    scheduled_for,
    subject,
    message,
    metadata,
    status
  )
  SELECT
    'booking_reminder',
    b.client_id,
    b.id,
    b.booking_datetime - INTERVAL '26 hours',
    'Recordatorio: tu cita es mañana',
    CONCAT(
      'Hola ', COALESCE(p.first_name, ''), '! Te recordamos que mañana, a las ',
      TO_CHAR(b.booking_datetime, 'HH24:MI'),
      ', tienes tu cita en The Nook Madrid. '
    ),
    jsonb_build_object(
      'reminder_variant', '26h',
      'channels', ARRAY['email']
    ),
    'pending'
  FROM public.bookings b
  JOIN public.profiles p ON b.client_id = p.id
  WHERE b.status = 'confirmed'
    AND b.booking_datetime BETWEEN (v_now + INTERVAL '26 hours') AND (v_now + INTERVAL '27 hours')
    AND NOT EXISTS (
      SELECT 1 FROM public.automated_notifications an
      WHERE an.booking_id = b.id
        AND an.type = 'booking_reminder'
        AND COALESCE(an.metadata ->> 'reminder_variant', '') = '26h'
    );

  -- Recordatorio 1 hora antes
  INSERT INTO public.automated_notifications (
    type,
    client_id,
    booking_id,
    scheduled_for,
    subject,
    message,
    metadata,
    status
  )
  SELECT
    'booking_reminder',
    b.client_id,
    b.id,
    b.booking_datetime - INTERVAL '1 hour',
    'Recordatorio: tu cita comienza en 1 hora',
    CONCAT(
      'Hola ', COALESCE(p.first_name, ''), '! Tu cita en The Nook Madrid comienza en 1 hora. ',
      'Te esperamos con tiempo para que llegues con calma. '
    ),
    jsonb_build_object(
      'reminder_variant', '1h',
      'channels', ARRAY['email']
    ),
    'pending'
  FROM public.bookings b
  JOIN public.profiles p ON b.client_id = p.id
  WHERE b.status = 'confirmed'
    AND b.booking_datetime BETWEEN (v_now + INTERVAL '1 hour') AND (v_now + INTERVAL '2 hours')
    AND NOT EXISTS (
      SELECT 1 FROM public.automated_notifications an
      WHERE an.booking_id = b.id
        AND an.type = 'booking_reminder'
        AND COALESCE(an.metadata ->> 'reminder_variant', '') = '1h'
    );
END;
$function$;
