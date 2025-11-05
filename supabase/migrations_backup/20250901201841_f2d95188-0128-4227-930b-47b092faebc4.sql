-- Adjust validate_booking_capacity to never block updates that don't change time/center/duration
CREATE OR REPLACE FUNCTION public.validate_booking_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  new_start timestamptz;
  new_end timestamptz;
  overlapping_count integer;
BEGIN
  -- Skip validation for UPDATEs that do not modify time, center, or duration
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.booking_datetime = NEW.booking_datetime 
        AND OLD.center_id = NEW.center_id 
        AND OLD.duration_minutes = NEW.duration_minutes) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Only validate if needed fields are present
  IF NEW.center_id IS NULL OR NEW.booking_datetime IS NULL OR NEW.duration_minutes IS NULL THEN
    RETURN NEW;
  END IF;

  -- Do not validate capacity for cancelled/completed/no_show states
  IF NEW.status IN ('cancelled', 'completed', 'no_show') THEN
    RETURN NEW;
  END IF;

  new_start := NEW.booking_datetime;
  new_end := NEW.booking_datetime + make_interval(mins => NEW.duration_minutes);

  SELECT COUNT(*)
  INTO overlapping_count
  FROM public.bookings b
  WHERE b.center_id = NEW.center_id
    AND b.status NOT IN ('cancelled', 'completed', 'no_show')
    AND b.booking_datetime < new_end
    AND (b.booking_datetime + make_interval(mins => b.duration_minutes)) > new_start;

  IF TG_OP = 'UPDATE' THEN
    overlapping_count := overlapping_count - 1;
  END IF;

  IF overlapping_count >= 4 THEN
    RAISE EXCEPTION 'Capacidad máxima alcanzada para esta franja horaria (máximo 4 reservas por centro).';
  END IF;

  RETURN NEW;
END;
$function$;