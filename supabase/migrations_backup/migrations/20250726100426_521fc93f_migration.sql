-- Arreglar las últimas funciones que faltan search_path

-- Función get_code_assignments_with_details
CREATE OR REPLACE FUNCTION public.get_code_assignments_with_details(target_entity_type text DEFAULT NULL::text, target_entity_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, code_id uuid, entity_type character varying, entity_id uuid, assigned_at timestamp with time zone, assigned_by uuid, notes text, code character varying, code_name character varying, code_color character varying, code_category character varying, assigner_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.code_id,
    ca.entity_type,
    ca.entity_id,
    ca.assigned_at,
    ca.assigned_by,
    ca.notes,
    ic.code,
    ic.name as code_name,
    ic.color as code_color,
    ic.category as code_category,
    CONCAT(p.first_name, ' ', p.last_name) as assigner_name
  FROM public.code_assignments ca
  JOIN public.internal_codes ic ON ca.code_id = ic.id
  LEFT JOIN public.profiles p ON ca.assigned_by = p.id
  WHERE 
    (target_entity_type IS NULL OR ca.entity_type = target_entity_type)
    AND (target_entity_id IS NULL OR ca.entity_id = target_entity_id)
  ORDER BY ca.assigned_at DESC;
END;
$function$;

-- Función search_entities_by_codes
CREATE OR REPLACE FUNCTION public.search_entities_by_codes(codes character varying[])
RETURNS TABLE(entity_type character varying, entity_id uuid, codes_assigned text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ca.entity_type,
    ca.entity_id,
    ARRAY_AGG(ic.code) as codes_assigned
  FROM public.code_assignments ca
  JOIN public.internal_codes ic ON ca.code_id = ic.id
  WHERE ic.code = ANY(codes)
  GROUP BY ca.entity_type, ca.entity_id
  HAVING COUNT(DISTINCT ic.code) = array_length(codes, 1);
END;
$function$;

-- Función calculate_revenue_metrics
CREATE OR REPLACE FUNCTION public.calculate_revenue_metrics(start_date date, end_date date, center_id_param uuid DEFAULT NULL::uuid)
RETURNS TABLE(total_revenue numeric, average_ticket numeric, total_bookings integer, revenue_by_service jsonb, revenue_by_day jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  WITH booking_data AS (
    SELECT 
      b.id,
      b.total_price_cents / 100.0 as revenue,
      b.booking_datetime::DATE as booking_date,
      s.name as service_name,
      s.type as service_type
    FROM public.bookings b
    LEFT JOIN public.services s ON b.service_id = s.id
    WHERE b.booking_datetime::DATE BETWEEN start_date AND end_date
      AND b.payment_status = 'completed'
      AND (center_id_param IS NULL OR b.center_id = center_id_param)
  ),
  revenue_summary AS (
    SELECT 
      SUM(revenue) as total_rev,
      AVG(revenue) as avg_ticket,
      COUNT(*) as total_count
    FROM booking_data
  ),
  service_revenue AS (
    SELECT 
      jsonb_object_agg(
        COALESCE(service_name, 'Sin Servicio'),
        SUM(revenue)
      ) as service_breakdown
    FROM booking_data
    GROUP BY service_name
  ),
  daily_revenue AS (
    SELECT 
      jsonb_object_agg(
        booking_date::TEXT,
        SUM(revenue)
      ) as daily_breakdown
    FROM booking_data
    GROUP BY booking_date
    ORDER BY booking_date
  )
  SELECT 
    rs.total_rev,
    rs.avg_ticket,
    rs.total_count::INTEGER,
    sr.service_breakdown,
    dr.daily_breakdown
  FROM revenue_summary rs
  CROSS JOIN service_revenue sr
  CROSS JOIN daily_revenue dr;
END;
$function$;

-- Función calculate_operational_metrics
CREATE OR REPLACE FUNCTION public.calculate_operational_metrics(start_date date, end_date date, center_id_param uuid DEFAULT NULL::uuid)
RETURNS TABLE(total_clients integer, new_clients integer, returning_clients integer, occupancy_rate numeric, no_show_rate numeric, avg_session_duration numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  WITH client_data AS (
    SELECT 
      b.client_id,
      MIN(b.booking_datetime::DATE) as first_booking,
      COUNT(*) as booking_count,
      SUM(CASE WHEN b.status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
      AVG(b.duration_minutes) as avg_duration
    FROM public.bookings b
    WHERE b.booking_datetime::DATE BETWEEN start_date AND end_date
      AND (center_id_param IS NULL OR b.center_id = center_id_param)
    GROUP BY b.client_id
  ),
  metrics AS (
    SELECT 
      COUNT(DISTINCT client_id) as total_client_count,
      COUNT(DISTINCT CASE WHEN first_booking BETWEEN start_date AND end_date THEN client_id END) as new_client_count,
      COUNT(DISTINCT CASE WHEN first_booking < start_date THEN client_id END) as returning_client_count,
      SUM(no_shows)::DECIMAL / SUM(booking_count) * 100 as no_show_percentage,
      AVG(avg_duration) as session_duration
    FROM client_data
  )
  SELECT 
    m.total_client_count::INTEGER,
    m.new_client_count::INTEGER,
    m.returning_client_count::INTEGER,
    85.0::DECIMAL,
    m.no_show_percentage,
    m.session_duration
  FROM metrics m;
END;
$function$;

-- Función get_business_intelligence
CREATE OR REPLACE FUNCTION public.get_business_intelligence(start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), end_date date DEFAULT CURRENT_DATE, center_id_param uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  revenue_data RECORD;
  operational_data RECORD;
  result JSONB;
BEGIN
  SELECT * INTO revenue_data 
  FROM public.calculate_revenue_metrics(start_date, end_date, center_id_param);
  
  SELECT * INTO operational_data 
  FROM public.calculate_operational_metrics(start_date, end_date, center_id_param);
  
  result := jsonb_build_object(
    'period', jsonb_build_object(
      'start_date', start_date,
      'end_date', end_date
    ),
    'revenue', jsonb_build_object(
      'total', revenue_data.total_revenue,
      'average_ticket', revenue_data.average_ticket,
      'total_bookings', revenue_data.total_bookings,
      'by_service', revenue_data.revenue_by_service,
      'by_day', revenue_data.revenue_by_day
    ),
    'operations', jsonb_build_object(
      'total_clients', operational_data.total_clients,
      'new_clients', operational_data.new_clients,
      'returning_clients', operational_data.returning_clients,
      'occupancy_rate', operational_data.occupancy_rate,
      'no_show_rate', operational_data.no_show_rate,
      'avg_session_duration', operational_data.avg_session_duration
    )
  );
  
  RETURN result;
END;
$function$;