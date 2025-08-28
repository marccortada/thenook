-- Make the 'logo' bucket publicly readable and allow staff uploads/management
-- Set bucket public (safe if already true)
update storage.buckets set public = true where id = 'logo';

-- Create storage policies for the 'logo' bucket if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can view logo'
  ) THEN
    CREATE POLICY "Public can view logo"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'logo');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff can upload to logo'
  ) THEN
    CREATE POLICY "Staff can upload to logo"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'logo' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee'))
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff can update logo'
  ) THEN
    CREATE POLICY "Staff can update logo"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'logo' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee'))
    )
    WITH CHECK (
      bucket_id = 'logo' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee'))
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff can delete logo'
  ) THEN
    CREATE POLICY "Staff can delete logo"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'logo' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee'))
    );
  END IF;
END $$;