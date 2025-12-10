-- Ensure every new booking starts with payment_status = 'pending'
ALTER TABLE public.bookings 
ALTER COLUMN payment_status SET DEFAULT 'pending';

-- Force pending on insert to avoid accidental "paid" flags when no payment exists
CREATE OR REPLACE FUNCTION public.bookings_force_pending_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  NEW.payment_status := 'pending';
  IF NEW.payment_method_status IS NULL THEN
    NEW.payment_method_status := 'pending';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_bookings_force_pending_payment ON public.bookings;
CREATE TRIGGER trg_bookings_force_pending_payment
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.bookings_force_pending_payment();

-- Backfill obvious inconsistencies: paid without any payment evidence should be pending
UPDATE public.bookings
SET payment_status = 'pending'
WHERE (payment_status IS NULL OR payment_status = 'paid')
  AND (payment_intent_id IS NULL OR payment_intent_id = '')
  AND (stripe_session_id IS NULL OR stripe_session_id = '')
  AND (payment_method IS NULL OR payment_method = '')
  AND (stripe_payment_method_id IS NULL OR stripe_payment_method_id = '');
