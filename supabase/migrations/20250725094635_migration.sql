-- Habilitar extensiones necesarias para cron jobs y HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crear tabla para tracking de análisis de notas
CREATE TABLE IF NOT EXISTS public.note_analysis_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid NOT NULL REFERENCES public.client_notes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

-- Crear tabla para notificaciones programadas automáticas
CREATE TABLE IF NOT EXISTS public.automated_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('booking_reminder', 'package_expiry', 'birthday', 'no_show_follow_up', 'satisfaction_survey')),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.client_packages(id) ON DELETE CASCADE,
  scheduled_for timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  subject text,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Crear tabla para tracking de actividad del sistema
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Crear tabla para métricas de negocio en tiempo real
CREATE TABLE IF NOT EXISTS public.real_time_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('count', 'percentage', 'currency', 'duration')),
  period_type text NOT NULL CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  metadata jsonb DEFAULT '{}',
  calculated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(metric_name, period_type, period_start)
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.note_analysis_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_time_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para note_analysis_queue
CREATE POLICY "Staff can view analysis queue" ON public.note_analysis_queue
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'employee'::user_role)
  );

CREATE POLICY "System can manage analysis queue" ON public.note_analysis_queue
  FOR ALL USING (true);

-- Políticas RLS para automated_notifications  
CREATE POLICY "Staff can view automated notifications" ON public.automated_notifications
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'employee'::user_role)
  );

CREATE POLICY "System can manage automated notifications" ON public.automated_notifications
  FOR ALL USING (true);

-- Políticas RLS para activity_log
CREATE POLICY "Staff can view activity log" ON public.activity_log
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'employee'::user_role)
  );

CREATE POLICY "System can create activity log" ON public.activity_log
  FOR INSERT WITH CHECK (true);

-- Políticas RLS para real_time_metrics
CREATE POLICY "Staff can view metrics" ON public.real_time_metrics
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'employee'::user_role)
  );

CREATE POLICY "System can manage metrics" ON public.real_time_metrics
  FOR ALL USING (true);

-- Función para automatizar creación de notificaciones de recordatorio
CREATE OR REPLACE FUNCTION public.create_booking_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Crear recordatorios para reservas confirmadas en las próximas 24 horas
  INSERT INTO public.automated_notifications (type, client_id, booking_id, scheduled_for, subject, message)
  SELECT 
    'booking_reminder',
    b.client_id,
    b.id,
    b.booking_datetime - INTERVAL '2 hours', -- Recordatorio 2 horas antes
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
$$;

-- Función para automatizar notificaciones de bonos por expirar
CREATE OR REPLACE FUNCTION public.create_package_expiry_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notificar bonos que expiran en 7 días
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
$$;

-- Función para calcular métricas en tiempo real
CREATE OR REPLACE FUNCTION public.calculate_real_time_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_hour timestamp with time zone;
  current_day date;
BEGIN
  current_hour := date_trunc('hour', now());
  current_day := CURRENT_DATE;
  
  -- Métricas diarias
  INSERT INTO public.real_time_metrics (metric_name, metric_value, metric_type, period_type, period_start, period_end)
  VALUES 
    -- Reservas de hoy
    ('daily_bookings', 
     (SELECT COUNT(*) FROM public.bookings WHERE DATE(booking_datetime) = current_day), 
     'count', 'daily', current_day::timestamp, (current_day + INTERVAL '1 day')::timestamp),
    
    -- Ingresos de hoy
    ('daily_revenue', 
     COALESCE((SELECT SUM(total_price_cents)/100.0 FROM public.bookings 
               WHERE DATE(booking_datetime) = current_day AND payment_status = 'completed'), 0), 
     'currency', 'daily', current_day::timestamp, (current_day + INTERVAL '1 day')::timestamp),
    
    -- Clientes nuevos de hoy
    ('daily_new_clients', 
     (SELECT COUNT(*) FROM public.profiles WHERE DATE(created_at) = current_day AND role = 'client'), 
     'count', 'daily', current_day::timestamp, (current_day + INTERVAL '1 day')::timestamp),
    
    -- Tasa de ocupación
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
$$;

-- Función para procesar análisis de notas pendientes
CREATE OR REPLACE FUNCTION public.queue_note_for_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo analizar notas que no son privadas y tienen contenido significativo
  IF length(NEW.content) > 20 THEN
    INSERT INTO public.note_analysis_queue (note_id)
    VALUES (NEW.id)
    ON CONFLICT (note_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para analizar notas automáticamente
CREATE TRIGGER trigger_queue_note_analysis
  AFTER INSERT ON public.client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_note_for_analysis();

-- Función para logging de actividad
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.activity_log (
    user_id, action, entity_type, entity_id, old_values, new_values
  ) VALUES (
    p_user_id, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values
  );
END;
$$;