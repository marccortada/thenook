-- Add pending_payment status and set as default for bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'booking_status' AND e.enumlabel = 'pending_payment'
  ) THEN
    ALTER TYPE public.booking_status ADD VALUE 'pending_payment';
  END IF;
END $$;

-- Backfill legacy "pending" and null statuses to pending_payment
UPDATE public.bookings
SET status = 'pending_payment'
WHERE status IS NULL OR status = 'pending';

-- Set default to pending_payment
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending_payment';
