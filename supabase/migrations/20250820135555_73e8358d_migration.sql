-- Create trigger to enqueue booking confirmations on confirmed bookings
DO $$
BEGIN
  CREATE TRIGGER trg_enqueue_booking_confirmation
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND NEW.client_id IS NOT NULL)
  EXECUTE FUNCTION public.enqueue_booking_confirmation();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;