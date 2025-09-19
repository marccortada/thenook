-- Update center names to distinguish between Zurbarán and Concha Espina locations
UPDATE public.centers 
SET name = 'Zurbarán', updated_at = now()
WHERE address LIKE '%Zurbarán%' OR address LIKE '%zurbaran%';

UPDATE public.centers 
SET name = 'Concha Espina', updated_at = now()
WHERE address LIKE '%Concha Espina%' OR address LIKE '%concha%' OR address LIKE '%espina%';