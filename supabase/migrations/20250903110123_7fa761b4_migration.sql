-- Add optional description and image_url to gift card options to match UI and emails
ALTER TABLE public.gift_card_options
  ADD COLUMN IF NOT EXISTS description text NULL,
  ADD COLUMN IF NOT EXISTS image_url text NULL;

-- Optional: create index for quick active queries (keeps it lean)
CREATE INDEX IF NOT EXISTS idx_gift_card_options_active ON public.gift_card_options (is_active);
