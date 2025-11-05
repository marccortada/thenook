-- Enforce max 4 overlapping bookings per center and time window
-- Use immutable-friendly expressions in indexes

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

  -- Count overlapping (excluding cancelled)
  SELECT COUNT(*)
  INTO overlapping_count
  FROM public.bookings b
  WHERE b.center_id = NEW.center_id
    AND b.status <> 'cancelled'
    AND tstzrange(b.booking_datetime, b.booking_datetime + make_interval(mins => b.duration_minutes), '[)') &&
        tstzrange(new_start, new_end, '[)');

  IF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*)
    INTO overlapping_count
    FROM public.bookings b
    WHERE b.center_id = NEW.center_id
      AND b.id <> NEW.id
      AND b.status <> 'cancelled'
      AND tstzrange(b.booking_datetime, b.booking_datetime + make_interval(mins => b.duration_minutes), '[)') &&
          tstzrange(new_start, new_end, '[)');
  END IF;

  IF overlapping_count >= 4 THEN
    RAISE EXCEPTION 'Capacidad máxima alcanzada para esta franja horaria (máximo 4 reservas por centro).';
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger
DROP TRIGGER IF EXISTS bookings_validate_capacity ON public.bookings;
CREATE TRIGGER bookings_validate_capacity
BEFORE INSERT OR UPDATE OF booking_datetime, duration_minutes, center_id, status
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_capacity();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_center_id ON public.bookings(center_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON public.bookings
USING GIST (
  tstzrange(
    booking_datetime,
    booking_datetime + make_interval(mins => duration_minutes),
    '[)'
  )
);
