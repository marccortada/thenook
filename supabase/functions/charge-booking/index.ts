import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || "", { apiVersion: '2023-10-16' });
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');

    const { booking_id, amount_cents } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ ok: false, error: 'booking_id is required' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, total_price_cents, stripe_payment_method_id, profiles!client_id(email), payment_status')
      .eq('id', booking_id)
      .maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message || 'Database error fetching booking' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!booking) {
      return new Response(JSON.stringify({ ok: false, error: 'Booking not found' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!booking.stripe_payment_method_id) {
      return new Response(JSON.stringify({ ok: false, error: 'No saved payment method' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const amount = typeof amount_cents === 'number' && amount_cents > 0
      ? amount_cents
      : (booking.total_price_cents || 0);
    if (amount <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Amount must be greater than 0' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Retrieve payment method to get the attached customer
    const pm = await stripe.paymentMethods.retrieve(booking.stripe_payment_method_id);
    let customerId = (pm.customer as string) || '';

    // If payment method isn't attached to a customer, try to find/create by client email and attach it
    if (!customerId) {
      const clientEmail = booking.profiles?.email;
      if (!clientEmail) {
        return new Response(JSON.stringify({ ok: false, error: 'Payment method has no customer and booking has no client email' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      }

      // Try to find existing customer
      const existing = await stripe.customers.list({ email: clientEmail, limit: 1 });
      let customer = existing.data[0] || null;
      if (!customer) {
        customer = await stripe.customers.create({ email: clientEmail });
      }

      try {
        await stripe.paymentMethods.attach(booking.stripe_payment_method_id, { customer: customer.id });
      } catch (attachErr) {
        // If already attached elsewhere, return a clearer error
        return new Response(JSON.stringify({ ok: false, error: `Unable to attach payment method to customer: ${(attachErr as Error).message}` }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      customerId = customer.id;
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      payment_method: booking.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Booking ${booking_id}`,
      metadata: { booking_id },
    });

    await supabase
      .from('bookings')
      .update({ 
        payment_status: 'paid', 
        payment_method: 'tarjeta',
        payment_notes: `Cobro automático Stripe PI ${intent.id}`,
        stripe_session_id: intent.id, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', booking_id);

    return new Response(JSON.stringify({ ok: true, payment_intent: intent.id, status: intent.status }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
