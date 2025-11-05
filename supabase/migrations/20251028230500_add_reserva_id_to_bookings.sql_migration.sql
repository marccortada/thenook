-- Add reserva_id link from bookings to reservas (idempotente)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reserva_id uuid REFERENCES public.reservas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_reserva_id ON public.bookings(reserva_id);

