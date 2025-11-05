-- Update RLS policies for centers table to allow staff to modify
DROP POLICY IF EXISTS "Only admins can modify centers" ON public.centers;
DROP POLICY IF EXISTS "Public can view active centers" ON public.centers;

-- Allow staff to view all centers
CREATE POLICY "Staff can view all centers" 
ON public.centers 
FOR SELECT 
USING (
  (active = true) OR 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
);

-- Allow staff to modify centers
CREATE POLICY "Staff can modify centers" 
ON public.centers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));