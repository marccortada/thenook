-- Recrear el trigger de validación de capacidad para que solo se ejecute en casos relevantes
DROP TRIGGER IF EXISTS trigger_validate_booking_capacity ON public.bookings;

CREATE OR REPLACE FUNCTION public.validate_booking_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  new_start timestamptz;
  new_end timestamptz;
  old_start timestamptz;
  old_end timestamptz;
  overlapping_count integer;
BEGIN
  -- Solo validar capacidad si:
  -- 1. Es una nueva reserva (INSERT)
  -- 2. Es un UPDATE que cambia la fecha/hora, centro, o estado a activo
  IF TG_OP = 'UPDATE' THEN
    -- Si no cambia fecha, centro, duración o estado relevante, permitir el update
    IF (OLD.booking_datetime = NEW.booking_datetime 
        AND OLD.center_id = NEW.center_id 
        AND OLD.duration_minutes = NEW.duration_minutes
        AND (OLD.status = NEW.status OR NEW.status IN ('cancelled', 'completed', 'no_show'))) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Solo validar si los campos necesarios están presentes
  IF NEW.center_id IS NULL OR NEW.booking_datetime IS NULL OR NEW.duration_minutes IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si el estado es cancelado, completado o no show, no validar capacidad
  IF NEW.status IN ('cancelled', 'completed', 'no_show') THEN
    RETURN NEW;
  END IF;

  new_start := NEW.booking_datetime;
  new_end := NEW.booking_datetime + make_interval(mins => NEW.duration_minutes);

  -- Contar reservas que se solapan en el mismo centro (excluyendo las canceladas/terminadas)
  SELECT COUNT(*)
  INTO overlapping_count
  FROM public.bookings b
  WHERE b.center_id = NEW.center_id
    AND b.status NOT IN ('cancelled', 'completed', 'no_show')
    AND b.booking_datetime < new_end
    AND (b.booking_datetime + make_interval(mins => b.duration_minutes)) > new_start;

  -- Si es UPDATE, excluir la reserva actual del conteo
  IF TG_OP = 'UPDATE' THEN
    overlapping_count := overlapping_count - 1;
  END IF;

  -- Verificar capacidad máxima
  IF overlapping_count >= 4 THEN
    RAISE EXCEPTION 'Capacidad máxima alcanzada para esta franja horaria (máximo 4 reservas por centro).';
  END IF;

  RETURN NEW;
END;
$function$;

-- Recrear el trigger solo para INSERT y UPDATE
CREATE TRIGGER trigger_validate_booking_capacity
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_capacity();