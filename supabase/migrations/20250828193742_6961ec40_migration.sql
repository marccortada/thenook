-- 1) Relax type constraint to allow 'booking_confirmation_with_payment'
ALTER TABLE public.automated_notifications
  DROP CONSTRAINT IF EXISTS automated_notifications_type_check;

-- 2) Allow enqueue on pending or confirmed bookings
CREATE OR REPLACE FUNCTION public.enqueue_booking_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_client RECORD;
  v_service_name TEXT;
BEGIN
  -- Only process if client_id is present and status is pending or confirmed
  IF NEW.client_id IS NULL OR NEW.status NOT IN ('pending','confirmed') THEN
    RETURN NEW;
  END IF;

  SELECT first_name, last_name, email INTO v_client FROM public.profiles WHERE id = NEW.client_id;
  SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

  -- Insert booking confirmation notification with payment link
  INSERT INTO public.automated_notifications (
    type, client_id, booking_id, scheduled_for, subject, message, metadata, status
  )
  VALUES (
    'booking_confirmation_with_payment',
    NEW.client_id,
    NEW.id,
    now(),
    'Confirmación de reserva - Asegurar con tarjeta',
    CONCAT(
      'Hola ', COALESCE(v_client.first_name, ''), ' ', COALESCE(v_client.last_name, ''), '! ',
      'Tu reserva para ', COALESCE(v_service_name, 'servicio'),
      ' es el ', TO_CHAR(NEW.booking_datetime, 'DD/MM/YYYY HH24:MI'), '. ',
      'Para asegurar tu reserva, por favor introduce tu tarjeta (no se cobrará hasta el momento del tratamiento).'
    ),
    jsonb_build_object(
      'channels', ARRAY['email'],
      'booking_id', NEW.id,
      'requires_payment_setup', true
    ),
    'pending'
  );

  RETURN NEW;
END;
$$;

-- 3) Backfill notification for the existing recent booking if missing
INSERT INTO public.automated_notifications (
  type, client_id, booking_id, scheduled_for, subject, message, metadata, status
)
SELECT 
  'booking_confirmation_with_payment',
  b.client_id,
  b.id,
  now(),
  'Confirmación de reserva - Asegurar con tarjeta',
  CONCAT(
    'Hola ', COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''), '! ',
    'Tu reserva para ', COALESCE(s.name, 'servicio'),
    ' es el ', TO_CHAR(b.booking_datetime, 'DD/MM/YYYY HH24:MI'), '. ',
    'Para asegurar tu reserva, por favor introduce tu tarjeta (no se cobrará hasta el momento del tratamiento).'
  ),
  jsonb_build_object(
    'channels', ARRAY['email'],
    'booking_id', b.id,
    'requires_payment_setup', true
  ),
  'pending'
FROM public.bookings b
JOIN public.profiles p ON b.client_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
WHERE b.id = 'e1be6820-7fdf-4941-87de-c8d868a551b3'
  AND NOT EXISTS (
    SELECT 1 FROM public.automated_notifications an 
    WHERE an.booking_id = b.id 
      AND an.type = 'booking_confirmation_with_payment'
  );