-- Create trigger to automatically enqueue booking confirmation notifications
CREATE TRIGGER trigger_enqueue_booking_confirmation
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_booking_confirmation();