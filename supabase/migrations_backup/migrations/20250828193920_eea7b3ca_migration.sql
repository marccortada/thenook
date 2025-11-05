-- Improve enqueue function to avoid duplicate notifications per booking
CREATE OR REPLACE FUNCTION public.enqueue_booking_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_client RECORD;
  v_service_name TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Only process if client_id is present and status is pending or confirmed
  IF NEW.client_id IS NULL OR NEW.status NOT IN ('pending','confirmed') THEN
    RETURN NEW;
  END IF;

  -- Skip if a notification already exists for this booking
  SELECT EXISTS (
    SELECT 1 FROM public.automated_notifications an
    WHERE an.booking_id = NEW.id
      AND an.type = 'booking_confirmation_with_payment'
  ) INTO v_exists;

  IF v_exists THEN
    RETURN NEW;
  END IF;

  SELECT first_name, last_name, email INTO v_client FROM public.profiles WHERE id = NEW.client_id;
  SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

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