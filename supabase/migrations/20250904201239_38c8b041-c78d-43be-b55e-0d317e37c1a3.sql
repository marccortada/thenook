-- 1) Desactivar duplicados de grupos activos manteniendo el más reciente por nombre
WITH ranked AS (
  SELECT 
    id,
    name,
    active,
    created_at,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY lower(name)
      ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.treatment_groups
  WHERE active = true
)
UPDATE public.treatment_groups tg
SET active = false, updated_at = now()
FROM ranked r
WHERE tg.id = r.id AND r.rn > 1;

-- 2) Asegurar que updated_at se actualiza automáticamente en updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_treatment_groups_updated_at'
  ) THEN
    CREATE TRIGGER update_treatment_groups_updated_at
    BEFORE UPDATE ON public.treatment_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) Evitar futuros duplicados por nombre en grupos activos
CREATE UNIQUE INDEX IF NOT EXISTS uq_treatment_groups_active_name
ON public.treatment_groups (lower(name))
WHERE active = true;