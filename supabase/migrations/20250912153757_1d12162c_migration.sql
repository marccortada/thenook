-- Add show_online field to services table
ALTER TABLE public.services 
ADD COLUMN show_online boolean NOT NULL DEFAULT true;

-- Add show_online field to packages table  
ALTER TABLE public.packages 
ADD COLUMN show_online boolean NOT NULL DEFAULT true;

-- Add show_online field to gift_card_options table
ALTER TABLE public.gift_card_options 
ADD COLUMN show_online boolean NOT NULL DEFAULT true;

-- Update existing records to show online by default
UPDATE public.services SET show_online = true WHERE show_online IS NULL;
UPDATE public.packages SET show_online = true WHERE show_online IS NULL;
UPDATE public.gift_card_options SET show_online = true WHERE show_online IS NULL;