-- 1) Disable expirations for packages and gift cards

-- a) Do not set packages to 'expired' based on expiry_date
CREATE OR REPLACE FUNCTION public.update_client_package_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.used_sessions >= NEW.total_sessions THEN
    NEW.status := 'used_up';
  ELSIF NEW.status NOT IN ('cancelled') THEN
    NEW.status := 'active';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- b) Allow using package session regardless of expiry_date
CREATE OR REPLACE FUNCTION public.use_client_package_session(package_id uuid, booking_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_client_package RECORD;
  v_success BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_client_package
  FROM public.client_packages 
  WHERE id = $1 
    AND status = 'active'
    AND used_sessions < total_sessions
  FOR UPDATE;
  
  IF FOUND THEN
    UPDATE public.client_packages 
    SET used_sessions = used_sessions + 1,
        updated_at = now()
    WHERE id = $1;
    
    IF $2 IS NOT NULL THEN
      UPDATE public.bookings 
      SET notes = COALESCE(notes, '') || ' | Bono usado: ' || v_client_package.voucher_code
      WHERE id = $2;
    END IF;
    
    v_success := TRUE;
  END IF;
  
  RETURN v_success;
END;
$function$;

-- c) Remove expiry checks from voucher/gift card redemption
CREATE OR REPLACE FUNCTION public.redeem_voucher_code(p_code text, p_booking_id uuid DEFAULT NULL::uuid, p_amount_cents integer DEFAULT NULL::integer, p_notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_pkg RECORD;
  v_gc RECORD;
  v_staff_id UUID;
  v_client_id UUID;
  v_remaining INTEGER;
BEGIN
  -- Resolve staff profile id
  SELECT id INTO v_staff_id FROM public.profiles WHERE user_id = auth.uid();
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de empleado no encontrado';
  END IF;

  -- Try package voucher first
  SELECT * INTO v_pkg
  FROM public.client_packages
  WHERE voucher_code = p_code
  FOR UPDATE;

  IF FOUND THEN
    IF v_pkg.status <> 'active' THEN RAISE EXCEPTION 'Bono no activo'; END IF;
    IF v_pkg.used_sessions >= v_pkg.total_sessions THEN RAISE EXCEPTION 'Bono sin sesiones disponibles'; END IF;

    UPDATE public.client_packages
    SET used_sessions = used_sessions + 1, updated_at = now()
    WHERE id = v_pkg.id;

    INSERT INTO public.client_package_usages (client_package_id, booking_id, used_by, notes)
    VALUES (v_pkg.id, p_booking_id, v_staff_id, p_notes);

    IF p_booking_id IS NOT NULL THEN
      UPDATE public.bookings
      SET notes = COALESCE(notes, '') || CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' | ' END || 'Bono usado: ' || v_pkg.voucher_code,
          payment_status = COALESCE(payment_status, 'pending')
      WHERE id = p_booking_id;
    END IF;

    SELECT (total_sessions - used_sessions) INTO v_remaining FROM public.client_packages WHERE id = v_pkg.id;

    RETURN jsonb_build_object('kind','package','success',true,'client_package_id',v_pkg.id,'remaining_sessions',v_remaining);
  END IF;

  -- Try gift card
  SELECT * INTO v_gc
  FROM public.gift_cards
  WHERE code = p_code
  FOR UPDATE;

  IF FOUND THEN
    IF v_gc.status <> 'active' THEN RAISE EXCEPTION 'Tarjeta no activa'; END IF;
    IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN RAISE EXCEPTION 'Importe inválido para canje'; END IF;
    IF p_amount_cents > v_gc.remaining_balance_cents THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;

    -- Determine client from booking if provided, else assigned
    IF p_booking_id IS NOT NULL THEN
      SELECT client_id INTO v_client_id FROM public.bookings WHERE id = p_booking_id;
    END IF;
    IF v_client_id IS NULL THEN
      v_client_id := v_gc.assigned_client_id;
    END IF;

    UPDATE public.gift_cards
    SET remaining_balance_cents = remaining_balance_cents - p_amount_cents,
        status = CASE WHEN remaining_balance_cents - p_amount_cents <= 0 THEN 'used_up' ELSE status END,
        updated_at = now()
    WHERE id = v_gc.id;

    INSERT INTO public.gift_card_redemptions (gift_card_id, amount_cents, redeemed_by, client_id, booking_id, notes)
    VALUES (v_gc.id, p_amount_cents, v_staff_id, v_client_id, p_booking_id, p_notes);

    IF p_booking_id IS NOT NULL THEN
      UPDATE public.bookings
      SET notes = COALESCE(notes, '') || CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' | ' END || 'Tarjeta: ' || v_gc.code || ' (' || p_amount_cents || '¢)',
          payment_status = 'paid'
      WHERE id = p_booking_id;
    END IF;

    SELECT remaining_balance_cents INTO v_remaining FROM public.gift_cards WHERE id = v_gc.id;

    RETURN jsonb_build_object('kind','gift_card','success',true,'gift_card_id',v_gc.id,'remaining_balance_cents',v_remaining);
  END IF;

  RAISE EXCEPTION 'Código no encontrado';
END;
$function$;

-- d) Disable package expiry notification generator (no-op)
CREATE OR REPLACE FUNCTION public.create_package_expiry_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- No-op: expiración deshabilitada
  RETURN;
END;
$function$;

-- 2) Enqueue booking confirmation emails automatically
CREATE OR REPLACE FUNCTION public.enqueue_booking_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_client RECORD;
  v_service_name TEXT;
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT first_name, last_name, email INTO v_client FROM public.profiles WHERE id = NEW.client_id;
  SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

  INSERT INTO public.automated_notifications (type, client_id, booking_id, scheduled_for, subject, message, metadata, status)
  VALUES (
    'appointment_confirmation',
    NEW.client_id,
    NEW.id,
    now(),
    'Confirmación de tu reserva en The Nook Madrid',
    CONCAT(
      'Hola ', COALESCE(v_client.first_name, ''), ' ', COALESCE(v_client.last_name, ''), '! ',
      'Tu reserva para ', COALESCE(v_service_name, 'servicio'),
      ' es el ', TO_CHAR(NEW.booking_datetime, 'DD/MM/YYYY HH24:MI'), '.'
    ),
    jsonb_build_object('channels', ARRAY['email']),
    'pending'
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_bookings_enqueue_confirmation ON public.bookings;
CREATE TRIGGER trg_bookings_enqueue_confirmation
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_booking_confirmation();