-- Add sessions metadata to gift card options
ALTER TABLE public.gift_card_options
ADD COLUMN IF NOT EXISTS sessions_count INTEGER DEFAULT 0;

UPDATE public.gift_card_options
SET sessions_count = COALESCE(sessions_count, 0);
