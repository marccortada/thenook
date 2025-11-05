-- Actualizar nombres de centros para diferenciarlos
UPDATE public.centers 
SET name = 'Zurbarán'
WHERE address LIKE '%Zurbarán%';

UPDATE public.centers 
SET name = 'Centro Concha Espina'
WHERE address LIKE '%Príncipe de Vergara%';