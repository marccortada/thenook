-- Add columns to services table for color and multiple lane assignments
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS lane_ids UUID[] DEFAULT '{}';

-- Create index for better performance on lane_ids queries
CREATE INDEX IF NOT EXISTS idx_services_lane_ids ON public.services USING GIN(lane_ids);