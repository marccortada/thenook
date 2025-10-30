CREATE OR REPLACE FUNCTION public.create_booking_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.automated_notifications (
    type,
    client_id,
    booking_id,
    scheduled_for,
    subject,
    message
  )
  SELECT
    'booking_reminder',
    b.client_id,
    b.id,
    b.booking_datetime - reminder.reminder_interval,
    'Recordatorio de tu cita en The Nook Madrid',
    CASE reminder.label
      WHEN '26_hours' THEN CONCAT(
        'Hola ', COALESCE(p.first_name, ''),
        '! Te recordamos que el ',
        TO_CHAR(b.booking_datetime AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY'),
        ' a las ',
        TO_CHAR(b.booking_datetime AT TIME ZONE 'Europe/Madrid', 'HH24:MI'),
        ' tienes tu cita en The Nook Madrid. Si necesitas modificarla, contáctanos respondiendo a este correo.'
      )
      ELSE CONCAT(
        'Hola ', COALESCE(p.first_name, ''),
        '! Falta 1 hora para tu cita en The Nook Madrid (',
        TO_CHAR(b.booking_datetime AT TIME ZONE 'Europe/Madrid', 'HH24:MI'),
        '). ¡Te esperamos!'
      )
    END
  FROM public.bookings b
  JOIN public.profiles p ON b.client_id = p.id
  CROSS JOIN (
    VALUES
      (INTERVAL '26 hours', '26_hours'),
      (INTERVAL '1 hour', '1_hour')
  ) AS reminder(reminder_interval, label)
  WHERE b.status = 'confirmed'
    AND b.booking_datetime BETWEEN now() + INTERVAL '1 hour' AND now() + INTERVAL '48 hours'
    AND b.booking_datetime - reminder.reminder_interval >= now()
    AND NOT EXISTS (
      SELECT 1
      FROM public.automated_notifications an
      WHERE an.booking_id = b.id
        AND an.type = 'booking_reminder'
        AND an.scheduled_for = b.booking_datetime - reminder.reminder_interval
    );
END;
$function$;
