-- Allow staff to delete bookings
CREATE POLICY "Staff can delete bookings" 
ON public.bookings 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));