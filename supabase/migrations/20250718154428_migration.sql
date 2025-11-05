-- Crear tipos de datos enum para el sistema
CREATE TYPE public.service_type AS ENUM ('massage', 'treatment', 'package');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partial_refund');
CREATE TYPE public.user_role AS ENUM ('admin', 'employee', 'client');
CREATE TYPE public.booking_channel AS ENUM ('web', 'whatsapp', 'email', 'phone');

-- Tabla de centros/locales
CREATE TABLE public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  role user_role DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de empleados
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  specialties TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de carriles/salas
CREATE TABLE public.lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de servicios
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type service_type NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de reservas principales
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  lane_id UUID REFERENCES public.lanes(id),
  employee_id UUID REFERENCES public.employees(id),
  booking_datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  total_price_cents INTEGER NOT NULL,
  status booking_status DEFAULT 'pending',
  channel booking_channel NOT NULL,
  notes TEXT,
  stripe_session_id TEXT,
  payment_status payment_status DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Función para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Políticas RLS básicas
-- Centers - Solo admin puede modificar
CREATE POLICY "Everyone can view centers" ON public.centers FOR SELECT USING (true);
CREATE POLICY "Only admins can modify centers" ON public.centers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles - Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Public profile creation" ON public.profiles FOR INSERT WITH CHECK (true);

-- Services - Todos pueden ver, solo admin/empleados pueden modificar
CREATE POLICY "Everyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Staff can modify services" ON public.services FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'));

-- Employees - Solo admin puede ver y modificar
CREATE POLICY "Admin can view employees" ON public.employees FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can modify employees" ON public.employees FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Lanes - Todos pueden ver, solo admin puede modificar
CREATE POLICY "Everyone can view lanes" ON public.lanes FOR SELECT USING (true);
CREATE POLICY "Only admins can modify lanes" ON public.lanes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Bookings - Usuarios pueden ver sus propias reservas
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (
  client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'employee')
);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can modify bookings" ON public.bookings FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'employee')
);

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON public.centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lanes_updated_at BEFORE UPDATE ON public.lanes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar datos iniciales
INSERT INTO public.centers (name, address, phone, email) VALUES 
('The Nook Madrid - Zurbarán', 'C. de Zurbarán, 10, bajo dcha, Chamberí, 28010 Madrid', '+34 910 123 456', 'zurbaran@thenook.es'),
('The Nook Madrid - Príncipe de Vergara', 'C. del Príncipe de Vergara, 204 duplicado posterior, local 10, 28002 Madrid', '+34 910 123 457', 'principedevergara@thenook.es');

-- Insertar servicios para ambos centros
INSERT INTO public.services (name, description, type, duration_minutes, price_cents, center_id) VALUES 
-- Servicios para Zurbarán
('Masaje Relajante', 'Masaje completo para liberar tensiones y proporcionar relajación profunda', 'massage', 60, 7000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Deportivo', 'Masaje especializado para deportistas, ideal para recuperación muscular', 'massage', 75, 8500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje Terapéutico', 'Tratamiento específico para aliviar dolores musculares y contracturas', 'massage', 90, 9500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Masaje de Espalda', 'Masaje focalizado en la zona de espalda, cuello y hombros', 'massage', 45, 5500, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Drenaje Linfático', 'Masaje suave que ayuda a eliminar toxinas y reduce la retención de líquidos', 'treatment', 60, 8000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),
('Reflexología Podal', 'Tratamiento de relajación a través de puntos de presión en los pies', 'treatment', 45, 6000, (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%')),

-- Servicios para Príncipe de Vergara
('Masaje Relajante', 'Masaje completo para liberar tensiones y proporcionar relajación profunda', 'massage', 60, 7000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Deportivo', 'Masaje especializado para deportistas, ideal para recuperación muscular', 'massage', 75, 8500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje Terapéutico', 'Tratamiento específico para aliviar dolores musculares y contracturas', 'massage', 90, 9500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Masaje de Espalda', 'Masaje focalizado en la zona de espalda, cuello y hombros', 'massage', 45, 5500, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Drenaje Linfático', 'Masaje suave que ayuda a eliminar toxinas y reduce la retención de líquidos', 'treatment', 60, 8000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%')),
('Reflexología Podal', 'Tratamiento de relajación a través de puntos de presión en los pies', 'treatment', 45, 6000, (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%'));

-- Insertar salas para ambos centros
INSERT INTO public.lanes (center_id, name) VALUES 
((SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%'), 'Sala 1'),
((SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%'), 'Sala 2'),
((SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%'), 'Sala VIP'),
((SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%'), 'Sala 1'),
((SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%'), 'Sala 2'),
((SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%'), 'Sala Premium');

-- Crear administrador y empleados
INSERT INTO public.profiles (email, first_name, last_name, phone, role) VALUES 
('admin@thenookmadrid.com', 'Administrador', 'The Nook', '+34 910 123 000', 'admin'),
('maria@thenookmadrid.com', 'María', 'González', '+34 600 111 222', 'employee'),
('carlos@thenookmadrid.com', 'Carlos', 'Martínez', '+34 600 333 444', 'employee'),
('ana@thenookmadrid.com', 'Ana', 'López', '+34 600 555 666', 'employee');

-- Crear empleados vinculados a centros
INSERT INTO public.employees (profile_id, center_id, specialties, active) VALUES 
(
  (SELECT id FROM public.profiles WHERE email = 'maria@thenookmadrid.com'),
  (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%'),
  ARRAY['Masaje Relajante', 'Masaje Terapéutico', 'Drenaje Linfático'],
  true
),
(
  (SELECT id FROM public.profiles WHERE email = 'carlos@thenookmadrid.com'),
  (SELECT id FROM public.centers WHERE name LIKE '%Príncipe de Vergara%'),
  ARRAY['Masaje Deportivo', 'Masaje Terapéutico'],
  true
),
(
  (SELECT id FROM public.profiles WHERE email = 'ana@thenookmadrid.com'),
  (SELECT id FROM public.centers WHERE name LIKE '%Zurbarán%'),
  ARRAY['Masaje Relajante', 'Reflexología Podal'],
  true
);