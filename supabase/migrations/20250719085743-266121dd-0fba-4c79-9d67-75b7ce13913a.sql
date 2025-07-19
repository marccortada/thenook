-- Create table for report templates
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('financial', 'operational', 'marketing', 'inventory', 'staff', 'custom')),
  parameters JSONB NOT NULL DEFAULT '{}',
  query_definition JSONB NOT NULL,
  chart_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for generated reports
CREATE TABLE public.generated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.report_templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  data JSONB NOT NULL,
  format VARCHAR(20) NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'csv', 'pdf')),
  file_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  error_message TEXT,
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create table for dashboard widgets
CREATE TABLE public.dashboard_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  widget_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 4,
  height INTEGER NOT NULL DEFAULT 4,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for business metrics
CREATE TABLE public.business_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for kpi targets
CREATE TABLE public.kpi_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  target_value DECIMAL(15,2) NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for report_templates
CREATE POLICY "Staff can view all report templates" 
ON public.report_templates 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can create report templates" 
ON public.report_templates 
FOR INSERT 
WITH CHECK ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) 
  AND created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Staff can update their own templates" 
ON public.report_templates 
FOR UPDATE 
USING ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) 
  AND (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::user_role)));

CREATE POLICY "Admins can delete templates" 
ON public.report_templates 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create policies for generated_reports
CREATE POLICY "Staff can view all generated reports" 
ON public.generated_reports 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can create reports" 
ON public.generated_reports 
FOR INSERT 
WITH CHECK ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role)) 
  AND generated_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create policies for dashboard_widgets
CREATE POLICY "Users can manage their own widgets" 
ON public.dashboard_widgets 
FOR ALL 
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create policies for business_metrics
CREATE POLICY "Staff can view all metrics" 
ON public.business_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can create metrics" 
ON public.business_metrics 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create policies for kpi_targets
CREATE POLICY "Staff can view all KPI targets" 
ON public.kpi_targets 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can manage KPI targets" 
ON public.kpi_targets 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create triggers for updated_at
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kpi_targets_updated_at
  BEFORE UPDATE ON public.kpi_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate revenue metrics
CREATE OR REPLACE FUNCTION public.calculate_revenue_metrics(
  start_date DATE,
  end_date DATE,
  center_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  total_revenue DECIMAL,
  average_ticket DECIMAL,
  total_bookings INTEGER,
  revenue_by_service JSONB,
  revenue_by_day JSONB
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate operational metrics
CREATE OR REPLACE FUNCTION public.calculate_operational_metrics(
  start_date DATE,
  end_date DATE,
  center_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  total_clients INTEGER,
  new_clients INTEGER,
  returning_clients INTEGER,
  occupancy_rate DECIMAL,
  no_show_rate DECIMAL,
  avg_session_duration DECIMAL
) AS $$
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
    85.0::DECIMAL, -- Placeholder for occupancy rate calculation
    m.no_show_percentage,
    m.session_duration
  FROM metrics m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate business intelligence summary
CREATE OR REPLACE FUNCTION public.get_business_intelligence(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE,
  center_id_param UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  revenue_data RECORD;
  operational_data RECORD;
  result JSONB;
BEGIN
  -- Get revenue metrics
  SELECT * INTO revenue_data 
  FROM public.calculate_revenue_metrics(start_date, end_date, center_id_param);
  
  -- Get operational metrics
  SELECT * INTO operational_data 
  FROM public.calculate_operational_metrics(start_date, end_date, center_id_param);
  
  -- Build result JSON
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX idx_business_metrics_name_period ON public.business_metrics(metric_name, period_start, period_end);
CREATE INDEX idx_business_metrics_center ON public.business_metrics(center_id);
CREATE INDEX idx_generated_reports_template ON public.generated_reports(template_id);
CREATE INDEX idx_generated_reports_user ON public.generated_reports(generated_by);
CREATE INDEX idx_dashboard_widgets_user ON public.dashboard_widgets(user_id);
CREATE INDEX idx_kpi_targets_period ON public.kpi_targets(period_start, period_end);

-- Insert default report templates
INSERT INTO public.report_templates (name, description, report_type, query_definition, chart_config) VALUES
('Reporte de Ingresos Mensual', 'Resumen detallado de ingresos por mes', 'financial', 
 '{"type": "revenue", "period": "monthly", "group_by": ["service", "date"]}',
 '{"type": "line", "x_axis": "date", "y_axis": "revenue", "color": "#10B981"}'),

('Análisis de Clientes', 'Métricas de adquisición y retención de clientes', 'marketing',
 '{"type": "clients", "metrics": ["new", "returning", "churn"], "period": "monthly"}',
 '{"type": "bar", "x_axis": "period", "y_axis": "count", "color": "#6366F1"}'),

('Rendimiento de Servicios', 'Popularidad y rentabilidad por tipo de servicio', 'operational',
 '{"type": "services", "metrics": ["bookings", "revenue", "duration"], "group_by": "service_type"}',
 '{"type": "pie", "value": "revenue", "label": "service_name", "colors": ["#10B981", "#F59E0B", "#EF4444"]}'),

('Inventario y Stock', 'Estado del inventario y movimientos', 'inventory',
 '{"type": "inventory", "metrics": ["stock_levels", "movements", "alerts"]}',
 '{"type": "mixed", "charts": [{"type": "bar", "data": "stock"}, {"type": "line", "data": "movements"}]}'),

('KPIs del Negocio', 'Indicadores clave de rendimiento', 'operational',
 '{"type": "kpis", "metrics": ["occupancy", "revenue_growth", "client_satisfaction", "staff_efficiency"]}',
 '{"type": "gauge", "ranges": [{"min": 0, "max": 50, "color": "#EF4444"}, {"min": 50, "max": 80, "color": "#F59E0B"}, {"min": 80, "max": 100, "color": "#10B981"}]}');

-- Insert sample KPI targets
INSERT INTO public.kpi_targets (metric_name, target_value, target_type, period_start, period_end) VALUES
('monthly_revenue', 50000.00, 'monthly', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'),
('new_clients_monthly', 100, 'monthly', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'),
('occupancy_rate', 85.0, 'monthly', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'),
('client_retention_rate', 75.0, 'monthly', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day');