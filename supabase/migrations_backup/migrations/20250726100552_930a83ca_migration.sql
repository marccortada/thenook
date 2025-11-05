-- Arreglar las últimas 2 funciones para completar la seguridad

-- Función calculate_real_time_metrics
CREATE OR REPLACE FUNCTION public.calculate_real_time_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_hour timestamp with time zone;
  current_day date;
BEGIN
  current_hour := date_trunc('hour', now());
  current_day := CURRENT_DATE;
  
  INSERT INTO public.real_time_metrics (metric_name, metric_value, metric_type, period_type, period_start, period_end)
  VALUES 
    ('daily_bookings', 
     (SELECT COUNT(*) FROM public.bookings WHERE DATE(booking_datetime) = current_day), 
     'count', 'daily', current_day::timestamp, (current_day + INTERVAL '1 day')::timestamp),
    
    ('daily_revenue', 
     COALESCE((SELECT SUM(total_price_cents)/100.0 FROM public.bookings 
               WHERE DATE(booking_datetime) = current_day AND payment_status = 'completed'), 0), 
     'currency', 'daily', current_day::timestamp, (current_day + INTERVAL '1 day')::timestamp),
    
    ('daily_new_clients', 
     (SELECT COUNT(*) FROM public.profiles WHERE DATE(created_at) = current_day AND role = 'client'), 
     'count', 'daily', current_day::timestamp, (current_day + INTERVAL '1 day')::timestamp),
    
    ('daily_occupancy_rate', 
     CASE 
       WHEN (SELECT COUNT(*) FROM public.bookings WHERE DATE(booking_datetime) = current_day) > 0 
       THEN (SELECT COUNT(*) FROM public.bookings 
             WHERE DATE(booking_datetime) = current_day AND status = 'confirmed')::numeric * 100.0 / 
            (SELECT COUNT(*) FROM public.bookings WHERE DATE(booking_datetime) = current_day)
       ELSE 0 
     END, 
     'percentage', 'daily', current_day::timestamp, (current_day + INTERVAL '1 day')::timestamp)
  ON CONFLICT (metric_name, period_type, period_start) 
  DO UPDATE SET 
    metric_value = EXCLUDED.metric_value,
    calculated_at = now();
END;
$function$;

-- Función queue_note_for_analysis (trigger function)
CREATE OR REPLACE FUNCTION public.queue_note_for_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF length(NEW.content) > 20 THEN
    INSERT INTO public.note_analysis_queue (note_id)
    VALUES (NEW.id)
    ON CONFLICT (note_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;