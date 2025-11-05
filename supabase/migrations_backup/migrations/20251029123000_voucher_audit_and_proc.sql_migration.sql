-- Tabla de auditoría de bonos
CREATE TABLE IF NOT EXISTS public.voucher_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  action text NOT NULL, -- e.g. 'use_session'
  note text,
  actor_user_id uuid,
  actor_email text,
  created_at timestamptz DEFAULT now()
);

-- Procedimiento transaccional para usar 1 sesión
CREATE OR REPLACE FUNCTION public.use_voucher_session(
  p_voucher_id uuid,
  p_note text,
  p_actor_user_id uuid,
  p_actor_email text
) RETURNS TABLE(used int, remaining int, total int, status text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_pkg RECORD;
BEGIN
  -- Bloquear fila del bono
  SELECT * INTO v_pkg
  FROM public.client_packages
  WHERE id = p_voucher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found' USING ERRCODE = 'NO_DATA_FOUND';
  END IF;

  IF COALESCE(v_pkg.status, 'active') <> 'active' THEN
    RAISE EXCEPTION 'Voucher is not active' USING ERRCODE = 'CHECK_VIOLATION';
  END IF;

  IF COALESCE(v_pkg.total_sessions, 0) <= COALESCE(v_pkg.used_sessions, 0) THEN
    RAISE EXCEPTION 'Voucher has no remaining sessions' USING ERRCODE = 'CHECK_VIOLATION';
  END IF;

  UPDATE public.client_packages
  SET used_sessions = COALESCE(used_sessions,0) + 1,
      updated_at = now()
  WHERE id = p_voucher_id
  RETURNING used_sessions, total_sessions INTO used, total;

  remaining := GREATEST(total - used, 0);
  status := CASE WHEN remaining = 0 THEN 'exhausted' ELSE 'active' END;

  IF status = 'exhausted' THEN
    UPDATE public.client_packages SET status = 'exhausted' WHERE id = p_voucher_id;
  END IF;

  INSERT INTO public.voucher_audit_logs (voucher_id, action, note, actor_user_id, actor_email)
  VALUES (p_voucher_id, 'use_session', p_note, p_actor_user_id, p_actor_email);

  RETURN NEXT;
END;
$$;

