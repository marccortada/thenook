-- Crear tabla para turnos de empleados
CREATE TABLE public.employee_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  center_id UUID,
  day_of_week INTEGER NOT NULL, -- 0=Domingo, 1=Lunes, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para ausencias/vacaciones
CREATE TABLE public.employee_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  absence_type VARCHAR(50) NOT NULL, -- 'vacation', 'sick_leave', 'personal', 'training'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para disponibilidad de empleados
CREATE TABLE public.employee_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  available_from TIME,
  available_until TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Crear tabla extendida para clientes (CRM)
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,
  preferred_employee_id UUID,
  allergies TEXT[],
  medical_conditions TEXT[],
  preferences JSONB DEFAULT '{}',
  satisfaction_score INTEGER DEFAULT 0, -- 0-100
  loyalty_points INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  total_spent_cents INTEGER DEFAULT 0,
  last_visit_date TIMESTAMP WITH TIME ZONE,
  preferred_time_slots TIME[],
  preferred_services UUID[],
  communication_preferences JSONB DEFAULT '{}', -- email, sms, whatsapp preferences
  birthday DATE,
  anniversary DATE,
  referral_source VARCHAR(100),
  vip_status BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para seguimiento de satisfacción
CREATE TABLE public.satisfaction_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  booking_id UUID,
  overall_rating INTEGER NOT NULL, -- 1-5
  service_rating INTEGER,
  staff_rating INTEGER,
  facility_rating INTEGER,
  feedback TEXT,
  would_recommend BOOLEAN,
  survey_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para programa de fidelización
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- 'earned', 'redeemed'
  points_amount INTEGER NOT NULL,
  booking_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para turnos de empleados
CREATE POLICY "Staff can view all shifts" ON public.employee_shifts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Admin can manage shifts" ON public.employee_shifts
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- Políticas RLS para ausencias
CREATE POLICY "Staff can view absences" ON public.employee_absences
  FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can create own absence requests" ON public.employee_absences
  FOR INSERT WITH CHECK (
    (has_role(auth.uid(), 'employee'::user_role) AND employee_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )) OR has_role(auth.uid(), 'admin'::user_role)
  );

CREATE POLICY "Admin can manage absences" ON public.employee_absences
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- Políticas RLS para disponibilidad
CREATE POLICY "Staff can view availability" ON public.employee_availability
  FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can manage own availability" ON public.employee_availability
  FOR ALL USING (
    (employee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) OR 
    has_role(auth.uid(), 'admin'::user_role)
  );

-- Políticas RLS para perfiles de clientes
CREATE POLICY "Staff can view client profiles" ON public.client_profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can manage client profiles" ON public.client_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Políticas RLS para encuestas de satisfacción
CREATE POLICY "Staff can view satisfaction surveys" ON public.satisfaction_surveys
  FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can create satisfaction surveys" ON public.satisfaction_surveys
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Políticas RLS para transacciones de fidelización
CREATE POLICY "Staff can view loyalty transactions" ON public.loyalty_transactions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can create loyalty transactions" ON public.loyalty_transactions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_employee_shifts_employee_day ON public.employee_shifts(employee_id, day_of_week);
CREATE INDEX idx_employee_absences_employee_dates ON public.employee_absences(employee_id, start_date, end_date);
CREATE INDEX idx_employee_availability_date ON public.employee_availability(employee_id, date);
CREATE INDEX idx_client_profiles_client_id ON public.client_profiles(client_id);
CREATE INDEX idx_satisfaction_surveys_client ON public.satisfaction_surveys(client_id, survey_date);
CREATE INDEX idx_loyalty_transactions_client ON public.loyalty_transactions(client_id, created_at);

-- Triggers para actualizar timestamps
CREATE TRIGGER update_employee_shifts_updated_at
  BEFORE UPDATE ON public.employee_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_absences_updated_at
  BEFORE UPDATE ON public.employee_absences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_availability_updated_at
  BEFORE UPDATE ON public.employee_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();