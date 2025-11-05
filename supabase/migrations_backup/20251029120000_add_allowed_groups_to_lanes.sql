-- Permit assign treatment groups per lane
ALTER TABLE public.lanes
  ADD COLUMN IF NOT EXISTS allowed_group_ids UUID[] DEFAULT '{}';

-- Index for fast membership queries
CREATE INDEX IF NOT EXISTS idx_lanes_allowed_group_ids ON public.lanes USING GIN(allowed_group_ids);

