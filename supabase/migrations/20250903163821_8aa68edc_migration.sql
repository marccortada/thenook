-- Update packages policy to allow staff access
DROP POLICY IF EXISTS "Only admins can modify packages" ON public.packages;

-- Create new policy that allows both admin and employee roles
CREATE POLICY "Staff can manage packages" 
ON public.packages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));