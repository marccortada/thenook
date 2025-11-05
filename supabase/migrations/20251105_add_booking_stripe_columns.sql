-- Add Stripe-related columns to bookings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bookings' AND column_name='stripe_customer_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bookings' AND column_name='payment_intent_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN payment_intent_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bookings' AND column_name='payment_method'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN payment_method text;
  END IF;
END $$;

