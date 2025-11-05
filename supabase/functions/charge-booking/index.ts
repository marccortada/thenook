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

    // AuthZ: only admin/owner
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_ANON_KEY') || '', { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: userData } = await supabaseAuth.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, org_id')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !['admin','owner'].includes((profile as any).role)) {
      return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { booking_id, amount_cents } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ ok: false, error: 'booking_id is required' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, total_price_cents, stripe_payment_method_id, stripe_customer_id, stripe_session_id, profiles!client_id(email), payment_status, status, center_id')
      .eq('id', booking_id)
      .maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message || 'Database error fetching booking' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!booking) {
      return new Response(JSON.stringify({ ok: false, error: 'Booking not found' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (booking.payment_status === 'paid') {
      return new Response(JSON.stringify({ ok: false, error: 'Already paid' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const amount = typeof amount_cents === 'number' && amount_cents > 0
      ? amount_cents
      : (booking.total_price_cents || 0);
    if (amount <= 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Amount must be greater than 0' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    // If we already have a PaymentIntent on the booking (manual capture flow), try to capture
    if (booking.stripe_session_id) {
      try {
        const existing = await stripe.paymentIntents.retrieve(booking.stripe_session_id);
        if (existing.status === 'requires_capture') {
          const pi = await stripe.paymentIntents.capture(
            existing.id,
            {},
            { idempotencyKey: `capture-booking-${booking_id}-${amount}` }
          );
          if (pi.status === 'succeeded') {
            await supabase.from('bookings').update({
              payment_status: 'paid',
              payment_method: 'tarjeta',
              payment_notes: `Capturado Stripe PI ${pi.id}`,
              stripe_session_id: pi.id,
              updated_at: new Date().toISOString(),
              status: 'confirmed'
            }).eq('id', booking_id);
            await supabase.from('business_metrics').insert({
              metric_name: 'payment_processed',
              metric_type: 'revenue',
              metric_value: amount / 100,
              period_start: new Date().toISOString().split('T')[0],
              period_end: new Date().toISOString().split('T')[0],
              metadata: { booking_id, action: 'capture', payment_intent: pi.id, amount_cents: amount, admin_user_id: user.id, org_id: (profile as any).org_id || null }
            });
            return new Response(JSON.stringify({ ok: true, payment_intent: pi.id, status: pi.status, mode: 'capture' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
          }
          return new Response(JSON.stringify({ ok: false, error: 'Capture did not succeed', status: pi.status }), { headers: { ...cors, 'Content-Type': 'application/json' } });
        }
      } catch (_) {
        // ignore and continue to off-session charge path
      }
    }

    // Off-session charge path using saved payment method
    if (!booking.stripe_payment_method_id) {
      return new Response(JSON.stringify({ ok: false, error: 'No saved payment method' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Determine or create customer and ensure PM is attached
    let customerId = booking.stripe_customer_id || '';
    if (!customerId) {
      const clientEmail = booking.profiles?.email;
      if (!clientEmail) {
        return new Response(JSON.stringify({ ok: false, error: 'Client email required to charge' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      const existing = await stripe.customers.list({ email: clientEmail, limit: 1 });
      let customer = existing.data[0] || null;
      if (!customer) customer = await stripe.customers.create({ email: clientEmail });
      customerId = customer.id;
    }

    // Ensure PM is attached to customer
    try {
      const pm = await stripe.paymentMethods.retrieve(booking.stripe_payment_method_id);
      if (!pm.customer) {
        await stripe.paymentMethods.attach(booking.stripe_payment_method_id, { customer: customerId });
      }
    } catch (attachErr) {
      return new Response(JSON.stringify({ ok: false, error: `Unable to attach payment method: ${(attachErr as Error).message}` }), { headers: { ...cors, 'Content-Type': 'application/json' } });
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
    }, { idempotencyKey: `charge-booking-${booking_id}-${amount}` });

    if (intent.status === 'succeeded') {
      await supabase
        .from('bookings')
        .update({ 
          payment_status: 'paid', 
          payment_method: 'tarjeta',
          payment_notes: `Cobro automático Stripe PI ${intent.id}`,
          stripe_session_id: intent.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
          status: 'confirmed'
        })
        .eq('id', booking_id);

      await supabase.from('business_metrics').insert({
        metric_name: 'payment_processed',
        metric_type: 'revenue',
        metric_value: amount / 100,
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        metadata: { booking_id, action: 'off_session_charge', payment_intent: intent.id, amount_cents: amount, admin_user_id: user.id, org_id: (profile as any).org_id || null }
      });

      return new Response(JSON.stringify({ ok: true, payment_intent: intent.id, status: intent.status, mode: 'charge' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // If requires action / authentication, report back but do not mark paid
    if (intent.status === 'requires_action' || intent.status === 'requires_payment_method' || intent.next_action) {
      return new Response(JSON.stringify({ ok: false, requires_action: true, status: intent.status, payment_intent: intent.id }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: `Payment failed with status ${intent.status}`, status: intent.status, payment_intent: intent.id }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
