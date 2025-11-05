-- Add configurable window_hours to pricing_policies (idempotente)
ALTER TABLE public.pricing_policies
  ADD COLUMN IF NOT EXISTS window_hours integer;

-- Opcional: poner valor por defecto 24 si es null para políticas de cancelación existentes
UPDATE public.pricing_policies
SET window_hours = COALESCE(window_hours, 24)
WHERE policy_type = 'cancellation';

