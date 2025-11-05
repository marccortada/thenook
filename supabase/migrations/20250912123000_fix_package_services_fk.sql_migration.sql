-- Fix foreign key so package_services references packages table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'package_services_package_id_fkey'
      AND table_name = 'package_services'
  ) THEN
    ALTER TABLE public.package_services
    DROP CONSTRAINT package_services_package_id_fkey;
  END IF;
END $$;

ALTER TABLE public.package_services
ADD CONSTRAINT package_services_package_id_fkey
FOREIGN KEY (package_id)
REFERENCES public.packages(id)
ON DELETE CASCADE;
