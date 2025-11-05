-- Add new booking status values to existing enum
ALTER TYPE public.booking_status ADD VALUE 'requested';
ALTER TYPE public.booking_status ADD VALUE 'new';
ALTER TYPE public.booking_status ADD VALUE 'online';

-- Add payment method field to bookings table
ALTER TABLE public.bookings ADD COLUMN payment_method TEXT;

-- Add payment notes field for additional payment information
ALTER TABLE public.bookings ADD COLUMN payment_notes TEXT;