-- Allow staff (admin/employee) and service role to manage package-service assignments
DROP POLICY IF EXISTS "Staff can manage package_services" ON public.package_services;

CREATE POLICY "Staff can manage package_services"
ON public.package_services
FOR ALL
USING (
  auth.jwt()->>'role' = 'service_role'
  OR has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'employee'::user_role)
)
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
  OR has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'employee'::user_role)
);
