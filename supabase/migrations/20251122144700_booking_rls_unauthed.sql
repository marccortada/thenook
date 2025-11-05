-- Permitir a usuarios anónimos crear reservas
CREATE POLICY IF NOT EXISTS "Anonymous clients can create bookings" ON public.bookings
  FOR INSERT
  WITH CHECK (true);

-- Permitir que admin y empleados vean todas las reservas (por si alguna política anterior lo impide)
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Staff and users can view bookings" ON public.bookings
  FOR SELECT
  USING (
    client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'employee')
    OR auth.role() = 'anon'
  );

-- Reafirmar permisos de actualización para staff
DROP POLICY IF EXISTS "Staff can modify bookings" ON public.bookings;
CREATE POLICY "Staff can modify bookings" ON public.bookings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'));
