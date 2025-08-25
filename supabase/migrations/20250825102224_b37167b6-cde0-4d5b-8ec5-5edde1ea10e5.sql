-- Fix the generate_voucher_code function to resolve ambiguous column references
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT (
      (SELECT COUNT(*) FROM public.client_packages WHERE voucher_code = new_code) +
      (SELECT COUNT(*) FROM public.gift_cards WHERE gift_cards.code = new_code)
    ) INTO exists_check;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN new_code;
END;
$function$;