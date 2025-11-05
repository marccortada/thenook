-- Reinstall pg_net in extensions schema if currently in public
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid 
    WHERE e.extname = 'pg_net' AND n.nspname = 'public'
  ) THEN
    DROP EXTENSION pg_net;
    CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
  END IF;
END $$;