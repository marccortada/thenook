-- Completar la revisión de seguridad: Arreglar las funciones restantes sin search_path

-- Arreglar todas las funciones restantes que no tienen search_path fijo

-- Función get_expiring_packages
CREATE OR REPLACE FUNCTION public.get_expiring_packages(days_ahead integer DEFAULT 7)
RETURNS TABLE(id uuid, client_id uuid, client_name text, client_email text, package_name text, voucher_code text, expiry_date timestamp with time zone, remaining_sessions integer, days_to_expiry integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.client_id,
    CONCAT(p.first_name, ' ', p.last_name) as client_name,
    p.email as client_email,
    pkg.name as package_name,
    cp.voucher_code,
    cp.expiry_date,
    (cp.total_sessions - cp.used_sessions) as remaining_sessions,
    EXTRACT(DAY FROM cp.expiry_date - now())::INTEGER as days_to_expiry
  FROM public.client_packages cp
  JOIN public.profiles p ON cp.client_id = p.id
  JOIN public.packages pkg ON cp.package_id = pkg.id
  WHERE cp.status = 'active'
    AND cp.expiry_date BETWEEN now() AND (now() + INTERVAL '1 day' * days_ahead)
    AND cp.used_sessions < cp.total_sessions
  ORDER BY cp.expiry_date ASC;
END;
$function$;

-- Función get_client_notes_with_details
CREATE OR REPLACE FUNCTION public.get_client_notes_with_details(target_client_id uuid DEFAULT NULL::uuid, category_filter text DEFAULT NULL::text, search_query text DEFAULT NULL::text, limit_count integer DEFAULT 50)
RETURNS TABLE(id uuid, client_id uuid, staff_id uuid, title text, content text, category text, priority text, is_private boolean, is_alert boolean, created_at timestamp with time zone, updated_at timestamp with time zone, client_name text, client_email text, staff_name text, staff_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cn.id,
    cn.client_id,
    cn.staff_id,
    cn.title,
    cn.content,
    cn.category,
    cn.priority,
    cn.is_private,
    cn.is_alert,
    cn.created_at,
    cn.updated_at,
    CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
    cp.email as client_email,
    CONCAT(sp.first_name, ' ', sp.last_name) as staff_name,
    sp.email as staff_email
  FROM public.client_notes cn
  JOIN public.profiles cp ON cn.client_id = cp.id
  JOIN public.profiles sp ON cn.staff_id = sp.id
  WHERE 
    (target_client_id IS NULL OR cn.client_id = target_client_id)
    AND (category_filter IS NULL OR cn.category = category_filter)
    AND (search_query IS NULL OR cn.search_vector @@ plainto_tsquery('spanish', search_query))
  ORDER BY 
    CASE WHEN cn.is_alert THEN 1 ELSE 2 END,
    CASE cn.priority 
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    cn.created_at DESC
  LIMIT limit_count;
END;
$function$;

-- Función get_active_client_alerts
CREATE OR REPLACE FUNCTION public.get_active_client_alerts()
RETURNS TABLE(id uuid, client_id uuid, client_name text, client_email text, title text, content text, category text, priority text, created_at timestamp with time zone, staff_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cn.id,
    cn.client_id,
    CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
    cp.email as client_email,
    cn.title,
    cn.content,
    cn.category,
    cn.priority,
    cn.created_at,
    CONCAT(sp.first_name, ' ', sp.last_name) as staff_name
  FROM public.client_notes cn
  JOIN public.profiles cp ON cn.client_id = cp.id
  JOIN public.profiles sp ON cn.staff_id = sp.id
  WHERE cn.is_alert = true
  ORDER BY 
    CASE cn.priority 
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    cn.created_at DESC;
END;
$function$;

-- Función toggle_note_alert
CREATE OR REPLACE FUNCTION public.toggle_note_alert(note_id uuid, is_alert_value boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE public.client_notes 
  SET is_alert = is_alert_value, updated_at = now()
  WHERE id = note_id;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$function$;

-- Función generate_po_number
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  next_number INTEGER;
  po_number TEXT;
BEGIN
  SELECT COALESCE(
    (SELECT MAX(CAST(REGEXP_REPLACE(order_number, '^PO-', '') AS INTEGER)) + 1
     FROM public.purchase_orders 
     WHERE order_number ~ '^PO-[0-9]+$'), 
    1000
  ) INTO next_number;
  
  po_number := 'PO-' || next_number;
  RETURN po_number;
END;
$function$;

-- Función get_codes_with_stats
CREATE OR REPLACE FUNCTION public.get_codes_with_stats()
RETURNS TABLE(id uuid, code character varying, name character varying, description text, color character varying, category character varying, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, creator_name text, usage_count bigint, last_used timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ic.id,
    ic.code,
    ic.name,
    ic.description,
    ic.color,
    ic.category,
    ic.created_at,
    ic.updated_at,
    ic.created_by,
    CONCAT(p.first_name, ' ', p.last_name) as creator_name,
    COALESCE(COUNT(ca.id), 0) as usage_count,
    MAX(ca.assigned_at) as last_used
  FROM public.internal_codes ic
  LEFT JOIN public.profiles p ON ic.created_by = p.id
  LEFT JOIN public.code_assignments ca ON ic.id = ca.code_id
  GROUP BY ic.id, ic.code, ic.name, ic.description, ic.color, ic.category, 
           ic.created_at, ic.updated_at, ic.created_by, p.first_name, p.last_name
  ORDER BY ic.created_at DESC;
END;
$function$;