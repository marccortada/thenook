-- Enqueue confirmation emails for client-facing (web) bookings without touching payment reminders
CREATE OR REPLACE FUNCTION public.enqueue_booking_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_client RECORD;
  v_service_name TEXT;
  v_web_confirmation_exists BOOLEAN;
BEGIN
  -- Only process rows with cliente asignado y en estado válido
  IF NEW.client_id IS NULL OR NEW.status NOT IN ('pending','confirmed') THEN
    RETURN NEW;
  END IF;

  -- Only look for prior email confirmations when booking comes from the client portal
  IF NEW.channel = 'web' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.automated_notifications an
      WHERE an.booking_id = NEW.id
        AND an.type = 'appointment_confirmation'
    ) INTO v_web_confirmation_exists;
  ELSE
    v_web_confirmation_exists := TRUE;
  END IF;

  SELECT first_name, last_name, email INTO v_client FROM public.profiles WHERE id = NEW.client_id;
  SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

  -- For bookings created por clientes en la web enviamos confirmación inmediata con política
  IF NEW.channel = 'web' AND NOT v_web_confirmation_exists THEN
    INSERT INTO public.automated_notifications (
      type, client_id, booking_id, scheduled_for, subject, message, metadata, status
    )
    VALUES (
      'appointment_confirmation',
      NEW.client_id,
      NEW.id,
      now(),
      'Tu reserva en THE NOOK Madrid',
      CONCAT(
        'Tu cita para ', COALESCE(v_service_name, 'nuestro tratamiento'), 
        ' el ', TO_CHAR(NEW.booking_datetime, 'DD/MM/YYYY HH24:MI'),
        ' ha quedado registrada. Recuerda revisar nuestra política de cancelación en ',
        'https://www.thenookmadrid.com/politica-de-cancelaciones/.'
      ),
      jsonb_build_object(
        'channels', ARRAY['email'],
        'booking_id', NEW.id,
        'source', 'web_portal_confirmation'
      ),
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Remove any pending payment-notification emails that would ask por la tarjeta
DELETE FROM public.automated_notifications
WHERE type = 'booking_confirmation_with_payment'
  AND status = 'pending';
