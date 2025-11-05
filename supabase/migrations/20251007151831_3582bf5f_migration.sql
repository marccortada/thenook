-- Actualizar nombres de centros para diferenciarlos
UPDATE public.centers 
SET name = 'The Nook Madrid - Zurbarán'
WHERE address LIKE '%Zurbarán%';

UPDATE public.centers 
SET name = 'The Nook Madrid - Príncipe de Vergara'
WHERE address LIKE '%Príncipe de Vergara%';