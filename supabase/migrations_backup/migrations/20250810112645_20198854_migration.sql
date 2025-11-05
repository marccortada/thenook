-- 1) Gift cards table
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  initial_balance_cents INTEGER NOT NULL CHECK (initial_balance_cents >= 0),
  remaining_balance_cents INTEGER NOT NULL CHECK (remaining_balance_cents >= 0),
  status TEXT NOT NULL DEFAULT 'active', -- active | used_up | expired | cancelled
  expiry_date TIMESTAMPTZ,
  assigned_client_id UUID REFERENCES public.profiles(id),
  purchased_by_email TEXT,
  purchased_by_name TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- Policies for gift_cards
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gift_cards' AND policyname = 'Staff can manage gift cards'
  ) THEN
    CREATE POLICY "Staff can manage gift cards"
    ON public.gift_cards
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gift_cards' AND policyname = 'Clients can view own gift cards'
  ) THEN
    CREATE POLICY "Clients can view own gift cards"
    ON public.gift_cards
    FOR SELECT
    USING (assigned_client_id IN (
      SELECT profiles.id FROM public.profiles WHERE profiles.user_id = auth.uid()
    ));
  END IF;
END $$;

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_gift_cards_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_gift_cards_updated_at
    BEFORE UPDATE ON public.gift_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) Gift card redemptions table
CREATE TABLE IF NOT EXISTS public.gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_by UUID REFERENCES public.profiles(id),
  client_id UUID REFERENCES public.profiles(id),
  booking_id UUID REFERENCES public.bookings(id),
  notes TEXT
);

ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gift_card_redemptions' AND policyname = 'Staff can insert gift card redemptions'
  ) THEN
    CREATE POLICY "Staff can insert gift card redemptions"
    ON public.gift_card_redemptions
    FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gift_card_redemptions' AND policyname = 'Staff can view redemptions'
  ) THEN
    CREATE POLICY "Staff can view redemptions"
    ON public.gift_card_redemptions
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));
  END IF;
END $$;

-- 3) Client package usages table
CREATE TABLE IF NOT EXISTS public.client_package_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_package_id UUID NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_by UUID REFERENCES public.profiles(id),
  notes TEXT
);

ALTER TABLE public.client_package_usages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_package_usages' AND policyname = 'Staff can insert package usages'
  ) THEN
    CREATE POLICY "Staff can insert package usages"
    ON public.client_package_usages
    FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_package_usages' AND policyname = 'Staff can view package usages'
  ) THEN
    CREATE POLICY "Staff can view package usages"
    ON public.client_package_usages
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));
  END IF;
END $$;

-- 4) Promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  type VARCHAR NOT NULL, -- 'percentage' | 'fixed_amount'
  value INTEGER NOT NULL,
  applies_to VARCHAR NOT NULL, -- 'service' | 'package' | 'gift_card' | 'all'
  target_id UUID,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  days_of_week INT[],
  time_start TIME,
  time_end TIME,
  coupon_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'promotions' AND policyname = 'Staff can manage promotions'
  ) THEN
    CREATE POLICY "Staff can manage promotions"
    ON public.promotions
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));
  END IF;
END $$;

-- Unique coupon code when provided
CREATE UNIQUE INDEX IF NOT EXISTS promotions_coupon_code_unique ON public.promotions (coupon_code) WHERE coupon_code IS NOT NULL;

-- updated_at trigger for promotions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_promotions_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_promotions_updated_at
    BEFORE UPDATE ON public.promotions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5) Update generate_voucher_code to ensure uniqueness across vouchers and gift cards
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT (
      (SELECT COUNT(*) FROM public.client_packages WHERE voucher_code = code) +
      (SELECT COUNT(*) FROM public.gift_cards WHERE code = code)
    ) INTO exists_check;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$function$;

-- 6) Redeem function for both packages and gift cards
CREATE OR REPLACE FUNCTION public.redeem_voucher_code(
  p_code TEXT,
  p_booking_id UUID DEFAULT NULL,
  p_amount_cents INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
    IF v_pkg.expiry_date IS NOT NULL AND v_pkg.expiry_date < now() THEN RAISE EXCEPTION 'Bono expirado'; END IF;

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
    IF v_gc.expiry_date IS NOT NULL AND v_gc.expiry_date < now() THEN RAISE EXCEPTION 'Tarjeta expirada'; END IF;
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
$$;