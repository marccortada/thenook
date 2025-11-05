-- Tighten RLS on automated_notifications to prevent data harvesting
-- Ensure RLS is enabled
ALTER TABLE public.automated_notifications ENABLE ROW LEVEL SECURITY;

-- Remove overly permissive policy that allowed anyone to manage the table
DROP POLICY IF EXISTS "System can manage automated notifications" ON public.automated_notifications;

-- Allow only staff (admin or employee) to insert new notifications
CREATE POLICY "Staff can insert automated notifications"
ON public.automated_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Allow only staff (admin or employee) to update notifications
CREATE POLICY "Staff can update automated notifications"
ON public.automated_notifications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Allow only staff (admin or employee) to delete notifications
CREATE POLICY "Staff can delete automated notifications"
ON public.automated_notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));