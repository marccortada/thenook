-- Create table for notification rules
CREATE TABLE public.notification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('booking_reminder', 'package_expiry', 'appointment_confirmation', 'birthday', 'no_show_follow_up')),
  trigger_days_before INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  message_template TEXT NOT NULL,
  send_via TEXT[] NOT NULL DEFAULT '{}', -- Array of 'email', 'sms', 'in_app'
  target_audience VARCHAR(50) NOT NULL DEFAULT 'all_clients' CHECK (target_audience IN ('all_clients', 'specific_segments')),
  segment_criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for scheduled notifications
CREATE TABLE public.scheduled_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.notification_rules(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  message_content TEXT NOT NULL,
  subject VARCHAR(255),
  send_via TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  related_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  related_package_id UUID REFERENCES public.client_packages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for notification templates
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_rules
CREATE POLICY "Staff can view all notification rules" 
ON public.notification_rules 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can create notification rules" 
ON public.notification_rules 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can update notification rules" 
ON public.notification_rules 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Admins can delete notification rules" 
ON public.notification_rules 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create policies for scheduled_notifications
CREATE POLICY "Staff can view all scheduled notifications" 
ON public.scheduled_notifications 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can create scheduled notifications" 
ON public.scheduled_notifications 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can update scheduled notifications" 
ON public.scheduled_notifications 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Clients can view their own notifications" 
ON public.scheduled_notifications 
FOR SELECT 
USING (client_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Create policies for notification_templates
CREATE POLICY "Staff can view all notification templates" 
ON public.notification_templates 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can create notification templates" 
ON public.notification_templates 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can update notification templates" 
ON public.notification_templates 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Admins can delete notification templates" 
ON public.notification_templates 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create triggers for updated_at
CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_notification_rules_trigger_type ON public.notification_rules(trigger_type);
CREATE INDEX idx_notification_rules_is_active ON public.notification_rules(is_active);
CREATE INDEX idx_scheduled_notifications_status ON public.scheduled_notifications(status);
CREATE INDEX idx_scheduled_notifications_scheduled_for ON public.scheduled_notifications(scheduled_for);
CREATE INDEX idx_scheduled_notifications_client_id ON public.scheduled_notifications(client_id);

-- Insert some default notification templates
INSERT INTO public.notification_templates (name, subject, content, variables, type) VALUES
('Recordatorio de Cita', 'Recordatorio: Tu cita de mañana', 'Hola {{client_name}}, te recordamos que tienes una cita programada para mañana {{appointment_date}} a las {{appointment_time}} para {{service_name}}. Te esperamos en {{center_name}}.', ARRAY['client_name', 'appointment_date', 'appointment_time', 'service_name', 'center_name'], 'email'),
('Paquete por Vencer', 'Tu paquete está por vencer', 'Hola {{client_name}}, tu paquete {{package_name}} vence el {{expiry_date}}. Tienes {{remaining_sessions}} sesiones restantes. ¡Programa tu cita para aprovecharlas!', ARRAY['client_name', 'package_name', 'expiry_date', 'remaining_sessions'], 'email'),
('Confirmación de Cita', 'Cita confirmada', 'Hola {{client_name}}, tu cita para {{service_name}} el {{appointment_date}} a las {{appointment_time}} ha sido confirmada. Te esperamos en {{center_name}}.', ARRAY['client_name', 'service_name', 'appointment_date', 'appointment_time', 'center_name'], 'email'),
('Cumpleaños', '¡Feliz Cumpleaños!', 'Hola {{client_name}}, ¡Feliz cumpleaños! Como regalo especial, tienes un 20% de descuento en tu próxima sesión. Válido hasta {{valid_until}}.', ARRAY['client_name', 'valid_until'], 'email');

-- Insert some default notification rules
INSERT INTO public.notification_rules (name, trigger_type, trigger_days_before, message_template, send_via, target_audience) VALUES
('Recordatorio 1 día antes', 'booking_reminder', 1, 'Hola {{client_name}}, te recordamos que tienes una cita mañana {{appointment_date}} a las {{appointment_time}} para {{service_name}}.', ARRAY['email'], 'all_clients'),
('Paquetes por vencer en 7 días', 'package_expiry', 7, 'Hola {{client_name}}, tu paquete {{package_name}} vence en 7 días ({{expiry_date}}). Tienes {{remaining_sessions}} sesiones restantes.', ARRAY['email', 'in_app'], 'all_clients'),
('Confirmación inmediata', 'appointment_confirmation', 0, 'Tu cita para {{service_name}} el {{appointment_date}} a las {{appointment_time}} ha sido confirmada.', ARRAY['email', 'sms'], 'all_clients');