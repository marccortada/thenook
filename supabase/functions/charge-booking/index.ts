import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || "", { apiVersion: '2023-10-16' });
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');

    const { booking_id, amount_cents } = await req.json();
    if (!booking_id) throw new Error('booking_id is required');

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, total_price_cents, stripe_payment_method_id, profiles!client_id(email), payment_status')
      .eq('id', booking_id)
      .maybeSingle();
    if (error) throw error;
    if (!booking) throw new Error('Booking not found');
    if (!booking.stripe_payment_method_id) throw new Error('No saved payment method');

    const amount = typeof amount_cents === 'number' && amount_cents > 0
      ? amount_cents
      : (booking.total_price_cents || 0);
    if (amount <= 0) throw new Error('Amount must be greater than 0');

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      payment_method: booking.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Booking ${booking_id}`,
      metadata: { booking_id },
    });

    await supabase
      .from('bookings')
      .update({ payment_status: 'paid', stripe_session_id: intent.id, updated_at: new Date().toISOString() })
      .eq('id', booking_id);

    return new Response(JSON.stringify({ ok: true, payment_intent: intent.id, status: intent.status }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});

