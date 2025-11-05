-- Manually create notification for existing booking
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