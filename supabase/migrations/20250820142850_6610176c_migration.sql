-- Permitir que usuarios anónimos creen perfiles de clientes para reservas
CREATE POLICY "Allow anonymous client profile creation for bookings" 
ON public.profiles 
FOR INSERT 
WITH CHECK (role = 'client');