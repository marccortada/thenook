-- Limit overlapping bookings to max 4 per center/time window
-- Create validation function and trigger on public.bookings

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
  -- Skip check if essential fields are missing
  IF NEW.center_id IS NULL OR NEW.booking_datetime IS NULL OR NEW.duration_minutes IS NULL THEN
    RETURN NEW;
  END IF;

  new_start := NEW.booking_datetime;
  new_end := NEW.booking_datetime + (NEW.duration_minutes::text || ' minutes')::interval;

  -- Count overlapping bookings at the same center (excluding cancelled)
  SELECT COUNT(*)
  INTO overlapping_count
  FROM public.bookings b
  WHERE b.center_id = NEW.center_id
    AND b.status <> 'cancelled'
    AND tstzrange(b.booking_datetime, b.booking_datetime + (b.duration_minutes::text || ' minutes')::interval, '[)') &&
        tstzrange(new_start, new_end, '[)');

  -- If updating, exclude the current row from the count
  IF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*)
    INTO overlapping_count
    FROM public.bookings b
    WHERE b.center_id = NEW.center_id
      AND b.id <> NEW.id
      AND b.status <> 'cancelled'
      AND tstzrange(b.booking_datetime, b.booking_datetime + (b.duration_minutes::text || ' minutes')::interval, '[)') &&
          tstzrange(new_start, new_end, '[)');
  END IF;

  IF overlapping_count >= 4 THEN
    RAISE EXCEPTION 'Capacidad máxima alcanzada para esta franja horaria (máximo 4 reservas por centro).';
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger to enforce capacity on INSERT/UPDATE
DROP TRIGGER IF EXISTS bookings_validate_capacity ON public.bookings;
CREATE TRIGGER bookings_validate_capacity
BEFORE INSERT OR UPDATE OF booking_datetime, duration_minutes, center_id, status
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_capacity();

-- Helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_center_id ON public.bookings(center_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON public.bookings
USING GIST (
  tstzrange(
    booking_datetime,
    booking_datetime + (duration_minutes::text || ' minutes')::interval,
    '[)'
  )
);
