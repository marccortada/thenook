-- Update the center that still has "The Nook Madrid" name to "Concha Espina"
UPDATE public.centers 
SET name = 'Concha Espina',
    updated_at = now()
WHERE id = '7dc13270-8ee1-4b78-814e-1882b4972bb4' 
  AND name = 'The Nook Madrid';