-- Add website and address fields to centers table
ALTER TABLE public.centers 
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS address_zurbaran text DEFAULT 'C. de Zurbarán, 10, bajo dcha, Chamberí, 28010 Madrid',
ADD COLUMN IF NOT EXISTS address_concha_espina text DEFAULT 'C. del Príncipe de Vergara, 204 duplicado posterior, local 10, 28002 Madrid';