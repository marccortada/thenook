-- Create period_purchases table to track purchased periods
CREATE TABLE public.period_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('day', 'month', 'quarter', 'year')),
  price_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  purchase_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.period_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for period purchases
CREATE POLICY "Users can view their own period purchases" 
ON public.period_purchases 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own period purchases" 
ON public.period_purchases 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can view all period purchases" 
ON public.period_purchases 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_period_purchases_updated_at
BEFORE UPDATE ON public.period_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();