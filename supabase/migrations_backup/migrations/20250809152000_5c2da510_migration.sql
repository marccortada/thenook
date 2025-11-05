-- Make expiry_date optional for client_packages
ALTER TABLE public.client_packages
ALTER COLUMN expiry_date DROP NOT NULL;

-- Fix ambiguous parameter references and allow NULL expiry in session usage function
CREATE OR REPLACE FUNCTION public.use_client_package_session(package_id uuid, booking_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_client_package RECORD;
  v_success BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_client_package
  FROM public.client_packages 
  WHERE id = $1 
    AND status = 'active'
    AND used_sessions < total_sessions
    AND (expiry_date IS NULL OR expiry_date > now())
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
$$;