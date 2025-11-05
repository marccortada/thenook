-- Create a cron job to invoke the send-booking-confirmation function every minute (idempotent)
DO $$
DECLARE
  job_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-booking-confirmation-every-minute'
  ) INTO job_exists;

  IF NOT job_exists THEN
    PERFORM cron.schedule(
      'send-booking-confirmation-every-minute',
      '* * * * *',
      $$
      SELECT net.http_post(
        url := 'https://duedcqgrflmmmxmpdytu.supabase.co/functions/v1/send-booking-confirmation',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZWRjcWdyZmxtbW14bXBkeXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0Njg2NzEsImV4cCI6MjA2ODA0NDY3MX0.o4u-NR2j3gYTkzjPDV3_Iu-Ru75W9KBwgetplEhuU_I"}'::jsonb,
        body := jsonb_build_object('source','cron','requested_at', now())
      ) AS request_id;
      $$
    );
  END IF;
END $$;