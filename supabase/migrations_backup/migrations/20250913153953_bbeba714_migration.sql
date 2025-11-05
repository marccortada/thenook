-- Create pricing_policies table for managing business pricing rules
CREATE TABLE public.pricing_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id),
  policy_type VARCHAR NOT NULL,
  policy_name VARCHAR NOT NULL,
  percentage_charge DECIMAL(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default no-show policy
INSERT INTO public.pricing_policies (policy_type, policy_name, percentage_charge, description)
VALUES 
  ('no_show', 'No Show Fee', 0, 'Porcentaje a cobrar cuando el cliente no se presenta a su cita'),
  ('cancellation', 'Late Cancellation Fee', 0, 'Porcentaje a cobrar por cancelaciones tardías (menos de 24h)'),
  ('early_cancellation', 'Early Cancellation Fee', 0, 'Porcentaje a cobrar por cancelaciones anticipadas');

-- Enable RLS
ALTER TABLE public.pricing_policies ENABLE ROW LEVEL SECURITY;

-- Create policies for pricing_policies
CREATE POLICY "Staff can view all pricing policies" 
ON public.pricing_policies 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Staff can modify pricing policies" 
ON public.pricing_policies 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_pricing_policies_updated_at
BEFORE UPDATE ON public.pricing_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();