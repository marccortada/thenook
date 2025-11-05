-- Add lane_ids array column to treatment_groups table for multiple lane assignments
ALTER TABLE public.treatment_groups 
ADD COLUMN IF NOT EXISTS lane_ids UUID[] DEFAULT '{}';

-- Create index for better performance on lane_ids queries
CREATE INDEX IF NOT EXISTS idx_treatment_groups_lane_ids ON public.treatment_groups USING GIN(lane_ids);

-- Update existing records to use array format where lane_id exists
UPDATE public.treatment_groups 
SET lane_ids = ARRAY[lane_id]::UUID[]
WHERE lane_id IS NOT NULL AND (lane_ids IS NULL OR array_length(lane_ids, 1) IS NULL);