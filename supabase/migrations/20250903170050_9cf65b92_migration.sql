-- Create treatment_groups table
CREATE TABLE IF NOT EXISTS public.treatment_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- hex color
  lane_id UUID REFERENCES public.lanes(id) ON DELETE SET NULL,
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, center_id) -- Unique group name per center
);

-- Add group_id to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.treatment_groups(id) ON DELETE SET NULL;

-- Enable RLS for treatment_groups
ALTER TABLE public.treatment_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for treatment_groups
CREATE POLICY "Public can view active treatment groups" 
ON public.treatment_groups 
FOR SELECT 
USING (active = true);

CREATE POLICY "Staff can manage treatment groups" 
ON public.treatment_groups 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_treatment_groups_updated_at
BEFORE UPDATE ON public.treatment_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create some default groups (optional)
INSERT INTO public.treatment_groups (name, color, center_id) 
SELECT 'Masajes Relajantes', '#10B981', id FROM public.centers WHERE active = true
ON CONFLICT (name, center_id) DO NOTHING;

INSERT INTO public.treatment_groups (name, color, center_id) 
SELECT 'Tratamientos Especializados', '#F59E0B', id FROM public.centers WHERE active = true
ON CONFLICT (name, center_id) DO NOTHING;

INSERT INTO public.treatment_groups (name, color, center_id) 
SELECT 'Rituales Premium', '#8B5CF6', id FROM public.centers WHERE active = true
ON CONFLICT (name, center_id) DO NOTHING;