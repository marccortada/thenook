-- Add sessions tracking columns to gift cards
ALTER TABLE public.gift_cards
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_sessions INTEGER DEFAULT 0;

-- Ensure existing rows have consistent values
UPDATE public.gift_cards
SET total_sessions = COALESCE(total_sessions, 0),
    remaining_sessions = COALESCE(remaining_sessions, total_sessions);
