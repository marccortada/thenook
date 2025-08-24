-- Create table for lane blocks
CREATE TABLE public.lane_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lane_id UUID NOT NULL,
  center_id UUID NOT NULL,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lane_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies for lane blocks
CREATE POLICY "Admins can manage lane blocks" 
ON public.lane_blocks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Staff can view lane blocks" 
ON public.lane_blocks 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lane_blocks_updated_at
BEFORE UPDATE ON public.lane_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_lane_blocks_datetime ON public.lane_blocks (lane_id, start_datetime, end_datetime);
CREATE INDEX idx_lane_blocks_center ON public.lane_blocks (center_id, start_datetime);