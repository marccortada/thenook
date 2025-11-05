-- Recreate cron jobs without embedding Authorization headers
-- Prior migrations scheduled HTTP calls with a Bearer token in headers.
-- Since the target function has verify_jwt = false, the header is unnecessary
-- and should not be stored in the repo.

DO $$
BEGIN
  -- Remove existing job if present
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-booking-confirmation-every-minute') THEN
    PERFORM cron.unschedule('send-booking-confirmation-every-minute');
  END IF;

  -- Recreate without Authorization header
  PERFORM cron.schedule(
    'send-booking-confirmation-every-minute',
    '* * * * *',
    $$
    SELECT net.http_post(
      url := 'https://duedcqgrflmmmxmpdytu.supabase.co/functions/v1/send-booking-confirmation',
      body := jsonb_build_object('source','cron','requested_at', now())
    );
    $$
  );
END $$;

DO $$
BEGIN
  -- Remove existing job if present
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-automated-notifications-every-5-min') THEN
    PERFORM cron.unschedule('send-automated-notifications-every-5-min');
  END IF;

  -- Recreate without Authorization header
  PERFORM cron.schedule(
    'send-automated-notifications-every-5-min',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
      url := 'https://duedcqgrflmmmxmpdytu.supabase.co/functions/v1/send-booking-confirmation',
      body := '{}'::jsonb
    );
    $$
  );
END $$;

