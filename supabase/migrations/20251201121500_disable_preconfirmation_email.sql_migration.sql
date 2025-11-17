-- Disable the automatic "asegura tu reserva" email and clean any pending items
CREATE OR REPLACE FUNCTION public.enqueue_booking_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Keep trigger for future extensibility but don't enqueue pre-confirmation emails
  RETURN NEW;
END;
$$;

-- Remove any pending pre-confirmation notifications that could still be sent
DELETE FROM public.automated_notifications
WHERE type IN ('booking_confirmation_with_payment', 'appointment_confirmation')
  AND status = 'pending';
