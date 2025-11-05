-- Create gift_card_options table for managing gift card denominations
CREATE TABLE IF NOT EXISTS public.gift_card_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  amount_cents integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gift_card_options_amount_unique UNIQUE (amount_cents)
);

-- Enable RLS
ALTER TABLE public.gift_card_options ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view active gift card options"
ON public.gift_card_options
FOR SELECT
USING (is_active = true);

CREATE POLICY "Staff can manage gift card options"
ON public.gift_card_options
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_update_gift_card_options_updated_at ON public.gift_card_options;
CREATE TRIGGER trg_update_gift_card_options_updated_at
BEFORE UPDATE ON public.gift_card_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();