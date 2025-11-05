-- Ensure booking confirmations are encoladas también para reservas en estado "pending"
DO $$
BEGIN
  -- Drop legacy trigger names if they exist
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_enqueue_booking_confirmation'
      AND tgrelid = 'public.bookings'::regclass
  ) THEN
    EXECUTE 'DROP TRIGGER trg_enqueue_booking_confirmation ON public.bookings';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_enqueue_booking_confirmation'
      AND tgrelid = 'public.bookings'::regclass
  ) THEN
    EXECUTE 'DROP TRIGGER trigger_enqueue_booking_confirmation ON public.bookings';
  END IF;

  -- Recreate trigger with broader condition to cover pending bookings
  EXECUTE '
    CREATE TRIGGER trg_enqueue_booking_confirmation
      AFTER INSERT OR UPDATE ON public.bookings
      FOR EACH ROW
      WHEN (NEW.client_id IS NOT NULL AND NEW.status IN (''pending'', ''confirmed''))
      EXECUTE FUNCTION public.enqueue_booking_confirmation()
  ';
END $$;
