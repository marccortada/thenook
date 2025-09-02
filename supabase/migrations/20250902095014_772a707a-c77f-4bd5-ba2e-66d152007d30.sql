-- Purge all bookings and related records to start fresh
BEGIN;

-- 1) Remove payment intents linked to bookings
DELETE FROM public.booking_payment_intents;

-- 2) Remove automated notifications tied to bookings (keep other non-booking notifications intact)
DELETE FROM public.automated_notifications WHERE booking_id IS NOT NULL;

-- 3) Optionally nullify booking references in auxiliary tables to preserve financial history (if columns exist)
-- Note: These statements are safe even if columns/tables don't exist; they will be skipped by DO blocks.
DO $$
BEGIN
  -- Client package usages: clear booking reference to avoid orphans
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'client_package_usages' AND column_name = 'booking_id'
  ) THEN
    UPDATE public.client_package_usages SET booking_id = NULL WHERE booking_id IS NOT NULL;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$
BEGIN
  -- Gift card redemptions: clear booking reference to keep accounting history
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gift_card_redemptions' AND column_name = 'booking_id'
  ) THEN
    UPDATE public.gift_card_redemptions SET booking_id = NULL WHERE booking_id IS NOT NULL;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- 4) Finally delete all bookings
DELETE FROM public.bookings;

COMMIT;