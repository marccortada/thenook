-- Remove the unique constraint on amount_cents to allow multiple gift cards with the same amount
ALTER TABLE public.gift_card_options DROP CONSTRAINT IF EXISTS gift_card_options_amount_unique;

-- Add a comment explaining why we allow duplicate amounts
COMMENT ON COLUMN public.gift_card_options.amount_cents IS 'Amount in cents - duplicates allowed for different gift card types';