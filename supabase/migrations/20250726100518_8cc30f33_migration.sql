-- Arreglar las últimas funciones restantes para completar la seguridad

-- Función update_inventory_stock (trigger function)
CREATE OR REPLACE FUNCTION public.update_inventory_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE public.inventory_items 
    SET current_stock = current_stock + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE public.inventory_items 
    SET current_stock = current_stock - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE public.inventory_items 
    SET current_stock = NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type = 'transfer' THEN
    UPDATE public.inventory_items 
    SET current_stock = current_stock - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  
  INSERT INTO public.low_stock_alerts (item_id, alert_level)
  SELECT 
    ii.id,
    CASE 
      WHEN ii.current_stock <= 0 THEN 'out_of_stock'
      WHEN ii.current_stock <= (ii.min_stock * 0.5) THEN 'critical'
      WHEN ii.current_stock <= ii.min_stock THEN 'low'
    END as alert_level
  FROM public.inventory_items ii
  WHERE ii.id = NEW.item_id 
    AND ii.current_stock <= ii.min_stock
    AND NOT EXISTS (
      SELECT 1 FROM public.low_stock_alerts 
      WHERE item_id = ii.id AND resolved_at IS NULL
    );
  
  RETURN NEW;
END;
$function$;

-- Función get_inventory_stats
CREATE OR REPLACE FUNCTION public.get_inventory_stats(center_id_param uuid DEFAULT NULL::uuid)
RETURNS TABLE(total_items integer, low_stock_items integer, out_of_stock_items integer, total_value numeric, average_stock numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_items,
    COUNT(CASE WHEN current_stock <= min_stock AND current_stock > 0 THEN 1 END)::integer as low_stock_items,
    COUNT(CASE WHEN current_stock <= 0 THEN 1 END)::integer as out_of_stock_items,
    COALESCE(SUM(current_stock * COALESCE(unit_cost, 0)), 0) as total_value,
    COALESCE(AVG(current_stock), 0) as average_stock
  FROM public.inventory_items
  WHERE is_active = true
    AND (center_id_param IS NULL OR center_id = center_id_param);
END;
$function$;

-- Función get_inventory_movements_with_details
CREATE OR REPLACE FUNCTION public.get_inventory_movements_with_details(item_id_param uuid DEFAULT NULL::uuid, movement_type_param text DEFAULT NULL::text, limit_count integer DEFAULT 100)
RETURNS TABLE(id uuid, item_id uuid, item_name text, item_sku text, movement_type text, quantity numeric, unit_cost numeric, total_cost numeric, reason text, notes text, performed_by uuid, performer_name text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    im.id,
    im.item_id,
    ii.name as item_name,
    ii.sku as item_sku,
    im.movement_type,
    im.quantity,
    im.unit_cost,
    im.total_cost,
    im.reason,
    im.notes,
    im.performed_by,
    CONCAT(p.first_name, ' ', p.last_name) as performer_name,
    im.created_at
  FROM public.inventory_movements im
  LEFT JOIN public.inventory_items ii ON im.item_id = ii.id
  LEFT JOIN public.profiles p ON im.performed_by = p.id
  WHERE 
    (item_id_param IS NULL OR im.item_id = item_id_param)
    AND (movement_type_param IS NULL OR im.movement_type = movement_type_param)
  ORDER BY im.created_at DESC
  LIMIT limit_count;
END;
$function$;

-- Función get_low_stock_alerts_with_details
CREATE OR REPLACE FUNCTION public.get_low_stock_alerts_with_details()
RETURNS TABLE(id uuid, item_id uuid, item_name text, item_sku text, current_stock numeric, min_stock numeric, alert_level text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    lsa.id,
    lsa.item_id,
    ii.name as item_name,
    ii.sku as item_sku,
    ii.current_stock,
    ii.min_stock,
    lsa.alert_level,
    lsa.created_at
  FROM public.low_stock_alerts lsa
  LEFT JOIN public.inventory_items ii ON lsa.item_id = ii.id
  WHERE lsa.resolved_at IS NULL
  ORDER BY 
    CASE lsa.alert_level 
      WHEN 'out_of_stock' THEN 1
      WHEN 'critical' THEN 2
      WHEN 'low' THEN 3
    END,
    lsa.created_at DESC;
END;
$function$;

-- Función get_analysis_stats
CREATE OR REPLACE FUNCTION public.get_analysis_stats(days_back integer DEFAULT 30)
RETURNS TABLE(total_notes integer, analyzed_notes integer, positive_sentiment integer, negative_sentiment integer, neutral_sentiment integer, critical_urgency integer, high_urgency integer, medium_urgency integer, low_urgency integer, avg_risk_level numeric, active_alerts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  WITH note_stats AS (
    SELECT 
      COUNT(cn.id) as total_notes,
      COUNT(na.id) as analyzed_notes,
      COUNT(CASE WHEN na.sentiment = 'positive' THEN 1 END) as positive_sentiment,
      COUNT(CASE WHEN na.sentiment = 'negative' THEN 1 END) as negative_sentiment,
      COUNT(CASE WHEN na.sentiment = 'neutral' THEN 1 END) as neutral_sentiment,
      COUNT(CASE WHEN na.urgency = 'critical' THEN 1 END) as critical_urgency,
      COUNT(CASE WHEN na.urgency = 'high' THEN 1 END) as high_urgency,
      COUNT(CASE WHEN na.urgency = 'medium' THEN 1 END) as medium_urgency,
      COUNT(CASE WHEN na.urgency = 'low' THEN 1 END) as low_urgency,
      AVG(na.risk_level) as avg_risk_level
    FROM public.client_notes cn
    LEFT JOIN public.note_analysis na ON cn.id = na.note_id
    WHERE cn.created_at >= (now() - interval '1 day' * days_back)
  ),
  alert_stats AS (
    SELECT COUNT(*) as active_alerts
    FROM public.client_alerts
    WHERE resolved = false
  )
  SELECT 
    ns.total_notes::integer,
    ns.analyzed_notes::integer,
    ns.positive_sentiment::integer,
    ns.negative_sentiment::integer,
    ns.neutral_sentiment::integer,
    ns.critical_urgency::integer,
    ns.high_urgency::integer,
    ns.medium_urgency::integer,
    ns.low_urgency::integer,
    COALESCE(ns.avg_risk_level, 0),
    ast.active_alerts::integer
  FROM note_stats ns
  CROSS JOIN alert_stats ast;
END;
$function$;

-- Función create_booking_reminders
CREATE OR REPLACE FUNCTION public.create_booking_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.automated_notifications (type, client_id, booking_id, scheduled_for, subject, message)
  SELECT 
    'booking_reminder',
    b.client_id,
    b.id,
    b.booking_datetime - INTERVAL '2 hours',
    'Recordatorio de tu cita en The Nook Madrid',
    CONCAT(
      'Hola ', p.first_name, '! Te recordamos que tienes una cita mañana a las ', 
      TO_CHAR(b.booking_datetime, 'HH24:MI'), 
      '. ¡Te esperamos!'
    )
  FROM public.bookings b
  JOIN public.profiles p ON b.client_id = p.id
  WHERE b.status = 'confirmed'
    AND b.booking_datetime BETWEEN now() + INTERVAL '1 hour' AND now() + INTERVAL '26 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.automated_notifications an 
      WHERE an.booking_id = b.id 
      AND an.type = 'booking_reminder'
    );
END;
$function$;

-- Función create_package_expiry_notifications
CREATE OR REPLACE FUNCTION public.create_package_expiry_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.automated_notifications (type, client_id, package_id, scheduled_for, subject, message)
  SELECT 
    'package_expiry',
    cp.client_id,
    cp.id,
    now(),
    'Tu bono está por expirar',
    CONCAT(
      'Hola ', p.first_name, '! Tu bono ', pkg.name, ' expira el ', 
      TO_CHAR(cp.expiry_date, 'DD/MM/YYYY'), 
      '. Te quedan ', (cp.total_sessions - cp.used_sessions), ' sesiones por usar.'
    )
  FROM public.client_packages cp
  JOIN public.profiles p ON cp.client_id = p.id
  JOIN public.packages pkg ON cp.package_id = pkg.id
  WHERE cp.status = 'active'
    AND cp.expiry_date BETWEEN now() AND now() + INTERVAL '7 days'
    AND cp.used_sessions < cp.total_sessions
    AND NOT EXISTS (
      SELECT 1 FROM public.automated_notifications an 
      WHERE an.package_id = cp.id 
      AND an.type = 'package_expiry'
      AND an.created_at > now() - INTERVAL '7 days'
    );
END;
$function$;