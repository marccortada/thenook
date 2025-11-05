-- Add fields to bookings table for payment method tracking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS stripe_setup_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending';

-- Create payment tracking table
CREATE TABLE IF NOT EXISTS public.booking_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_setup_intent_id TEXT NOT NULL,
  stripe_payment_method_id TEXT,
  client_secret TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requires_payment_method',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id, stripe_setup_intent_id)
);

-- Enable RLS
ALTER TABLE public.booking_payment_intents ENABLE ROW LEVEL SECURITY;

-- Create policies for booking_payment_intents
CREATE POLICY "Staff can manage payment intents" ON public.booking_payment_intents
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'employee'::user_role));

CREATE POLICY "Users can view their own payment intents" ON public.booking_payment_intents
FOR SELECT
USING (booking_id IN (
  SELECT id FROM public.bookings 
  WHERE client_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
));

-- Create updated_at trigger for payment intents
CREATE TRIGGER update_booking_payment_intents_updated_at
BEFORE UPDATE ON public.booking_payment_intents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the enqueue_booking_confirmation function to handle automatic email with payment link
CREATE OR REPLACE FUNCTION public.enqueue_booking_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_client RECORD;
  v_service_name TEXT;
BEGIN
  -- Only process if client_id is present and status is confirmed
  IF NEW.client_id IS NULL OR NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT first_name, last_name, email INTO v_client FROM public.profiles WHERE id = NEW.client_id;
  SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

  -- Insert booking confirmation notification with payment link
  INSERT INTO public.automated_notifications (
    type, 
    client_id, 
    booking_id, 
    scheduled_for, 
    subject, 
    message, 
    metadata, 
    status
  )
  VALUES (
    'booking_confirmation_with_payment',
    NEW.client_id,
    NEW.id,
    now(),
    'Confirmación de reserva - Asegurar con tarjeta',
    CONCAT(
      'Hola ', COALESCE(v_client.first_name, ''), ' ', COALESCE(v_client.last_name, ''), '! ',
      'Tu reserva para ', COALESCE(v_service_name, 'servicio'),
      ' es el ', TO_CHAR(NEW.booking_datetime, 'DD/MM/YYYY HH24:MI'), '. ',
      'Para asegurar tu reserva, por favor introduce tu tarjeta (no se cobrará hasta el momento del tratamiento).'
    ),
    jsonb_build_object(
      'channels', ARRAY['email'],
      'booking_id', NEW.id,
      'requires_payment_setup', true
    ),
    'pending'
  );

  RETURN NEW;
END;
$function$;