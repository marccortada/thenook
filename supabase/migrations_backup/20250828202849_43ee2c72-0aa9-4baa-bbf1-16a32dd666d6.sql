-- Enforce max 4 overlapping bookings per center and time window
-- Use a simple trigger without complex expressions in indexes

CREATE OR REPLACE FUNCTION public.validate_booking_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_start timestamptz;
  new_end timestamptz;
  overlapping_count integer;
BEGIN
  IF NEW.center_id IS NULL OR NEW.booking_datetime IS NULL OR NEW.duration_minutes IS NULL THEN
    RETURN NEW;
  END IF;

  new_start := NEW.booking_datetime;
  new_end := NEW.booking_datetime + make_interval(mins => NEW.duration_minutes);

  -- Count overlapping bookings at the same center (excluding cancelled/ended)
  SELECT COUNT(*)
  INTO overlapping_count
  FROM public.bookings b
  WHERE b.center_id = NEW.center_id
    AND b.status NOT IN ('cancelled', 'completed', 'no_show')
    AND b.booking_datetime < new_end
    AND (b.booking_datetime + make_interval(mins => b.duration_minutes)) > new_start;

  -- If updating, exclude the current booking from count
  IF TG_OP = 'UPDATE' THEN
    overlapping_count := overlapping_count - 1;
  END IF;

  IF overlapping_count >= 4 THEN
    RAISE EXCEPTION 'Capacidad máxima alcanzada para esta franja horaria (máximo 4 reservas por centro).';
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger to enforce capacity validation
DROP TRIGGER IF EXISTS bookings_validate_capacity ON public.bookings;
CREATE TRIGGER bookings_validate_capacity
BEFORE INSERT OR UPDATE OF booking_datetime, duration_minutes, center_id, status
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_capacity();

-- Simple indexes for performance (no complex expressions)
CREATE INDEX IF NOT EXISTS idx_bookings_center_datetime ON public.bookings(center_id, booking_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);