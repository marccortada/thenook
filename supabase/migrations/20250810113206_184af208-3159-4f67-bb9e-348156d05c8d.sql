-- Move extension from public to extensions schema to satisfy linter
DO $$ BEGIN
  PERFORM 1 FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid 
  WHERE e.extname = 'pg_net' AND n.nspname = 'public';
  IF FOUND THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
END $$;