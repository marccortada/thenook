-- Modify the trigger to call the invoice function after booking creation
CREATE OR REPLACE FUNCTION public.enqueue_booking_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_client RECORD;
  v_service_name TEXT;
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT first_name, last_name, email INTO v_client FROM public.profiles WHERE id = NEW.client_id;
  SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

  -- Insert appointment confirmation notification
  INSERT INTO public.automated_notifications (type, client_id, booking_id, scheduled_for, subject, message, metadata, status)
  VALUES (
    'appointment_confirmation',
    NEW.client_id,
    NEW.id,
    now(),
    'Confirmación de tu reserva en The Nook Madrid',
    CONCAT(
      'Hola ', COALESCE(v_client.first_name, ''), ' ', COALESCE(v_client.last_name, ''), '! ',
      'Tu reserva para ', COALESCE(v_service_name, 'servicio'),
      ' es el ', TO_CHAR(NEW.booking_datetime, 'DD/MM/YYYY HH24:MI'), '.'
    ),
    jsonb_build_object('channels', ARRAY['email']),
    'pending'
  );

  -- Insert invoice notification (new)
  INSERT INTO public.automated_notifications (type, client_id, booking_id, scheduled_for, subject, message, metadata, status)
  VALUES (
    'booking_invoice',
    NEW.client_id,
    NEW.id,
    now(),
    'Factura de tu reserva - The Nook Madrid',
    'Factura generada automáticamente para tu reserva',
    jsonb_build_object('channels', ARRAY['email'], 'booking_id', NEW.id),
    'pending'
  );

  RETURN NEW;
END;
$function$;