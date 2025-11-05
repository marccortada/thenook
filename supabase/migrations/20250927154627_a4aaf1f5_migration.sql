-- Add booking codes functionality
ALTER TABLE public.bookings 
ADD COLUMN booking_codes text[] DEFAULT '{}';

-- Create index for better performance when filtering by codes
CREATE INDEX idx_bookings_codes ON public.bookings USING GIN(booking_codes);

-- Add comment
COMMENT ON COLUMN public.bookings.booking_codes IS 'Array of internal codes assigned specifically to this booking';