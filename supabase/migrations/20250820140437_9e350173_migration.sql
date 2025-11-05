-- Create a cron job to invoke the send-booking-confirmation function every minute
SELECT cron.schedule(
  'send-booking-confirmation',
  '* * * * *',
  $$select net.http_post(
    url:='https://duedcqgrflmmmxmpdytu.supabase.co/functions/v1/send-booking-confirmation',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZWRjcWdyZmxtbW14bXBkeXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0Njg2NzEsImV4cCI6MjA2ODA0NDY3MX0.o4u-NR2j3gYTkzjPDV3_Iu-Ru75W9KBwgetplEhuU_I"}'::jsonb,
    body:=concat('{"source": "cron", "time": "', now(), '"}')::jsonb
  ) as request_id;$$
);