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
    console.log('[CHARGE-BOOKING] Function started');
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || "", { apiVersion: '2023-10-16' });
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');

    // AuthZ: verificar que el usuario esté autenticado
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_ANON_KEY') || '', { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: userData } = await supabaseAuth.auth.getUser();
    const user = userData?.user;
    if (!user) {
      console.log('[CHARGE-BOOKING] Unauthorized - no user');
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    
    console.log('[CHARGE-BOOKING] User authenticated:', user.id);

    const { booking_id, amount_cents, skip_email } = await req.json();
    console.log('[CHARGE-BOOKING] Params received:', { booking_id, amount_cents, skip_email });
    if (!booking_id) {
      console.log('[CHARGE-BOOKING] Error: booking_id is required');
      return new Response(JSON.stringify({ ok: false, error: 'booking_id is required' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, total_price_cents, stripe_payment_method_id, stripe_customer_id, payment_intent_id, stripe_session_id, profiles!client_id(email), payment_status, status, center_id')
      .eq('id', booking_id)
      .maybeSingle();
    if (error) {
      console.log('[CHARGE-BOOKING] Database error:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message || 'Database error fetching booking' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!booking) {
      console.log('[CHARGE-BOOKING] Booking not found:', booking_id);
      return new Response(JSON.stringify({ ok: false, error: 'Booking not found' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (booking.payment_status === 'paid') {
      console.log('[CHARGE-BOOKING] Already paid:', booking_id);
      return new Response(JSON.stringify({ ok: false, error: 'Already paid' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    
    console.log('[CHARGE-BOOKING] Booking data:', { 
      id: booking.id, 
      payment_method: booking.stripe_payment_method_id, 
      customer: booking.stripe_customer_id,
      intent: booking.payment_intent_id || booking.stripe_session_id,
      total: booking.total_price_cents 
    });

    const amount = typeof amount_cents === 'number' && amount_cents > 0
      ? amount_cents
      : (booking.total_price_cents || 0);
    if (amount <= 0) {
      console.log('[CHARGE-BOOKING] Invalid amount:', amount);
      return new Response(JSON.stringify({ ok: false, error: 'Amount must be greater than 0' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    
    console.log('[CHARGE-BOOKING] Amount to charge:', amount);
    
    // If we already have a PaymentIntent on the booking (manual capture flow), try to capture
    const existingIntentId = booking.payment_intent_id || booking.stripe_session_id;
    if (existingIntentId) {
      console.log('[CHARGE-BOOKING] Attempting to capture existing PaymentIntent:', existingIntentId);
      try {
        const existing = await stripe.paymentIntents.retrieve(existingIntentId);
        console.log('[CHARGE-BOOKING] Existing PI status:', existing.status);
        
        if (existing.status === 'requires_capture') {
          console.log('[CHARGE-BOOKING] Capturing PaymentIntent...');
          const pi = await stripe.paymentIntents.capture(
            existing.id,
            {},
            { idempotencyKey: `capture-booking-${booking_id}-${amount}` }
          );
          console.log('[CHARGE-BOOKING] Capture result:', pi.status);
          
          if (pi.status === 'succeeded') {
            await supabase.from('bookings').update({
              payment_status: 'paid',
              payment_method: 'tarjeta',
              payment_notes: `Capturado Stripe PI ${pi.id}`,
              payment_intent_id: pi.id,
              updated_at: new Date().toISOString(),
              status: 'confirmed'
            }).eq('id', booking_id);
            
            await supabase.from('business_metrics').insert({
              metric_name: 'payment_processed',
              metric_type: 'revenue',
              metric_value: amount / 100,
              period_start: new Date().toISOString().split('T')[0],
              period_end: new Date().toISOString().split('T')[0],
              metadata: { booking_id, action: 'capture', payment_intent: pi.id, amount_cents: amount, admin_user_id: user.id }
            });
            
            // Enviar email de cobro exitoso (solo si no es no_show)
            if (!skip_email) {
              try {
                await supabase.functions.invoke('send-booking-with-payment', { 
                  body: { booking_id } 
                });
                console.log('[CHARGE-BOOKING] Payment confirmation email sent');
              } catch (emailErr) {
                console.warn('[CHARGE-BOOKING] Email failed but payment succeeded:', emailErr);
              }
            } else {
              console.log('[CHARGE-BOOKING] Skipping email (no_show booking)');
            }
            
            console.log('[CHARGE-BOOKING] Capture successful');
            return new Response(JSON.stringify({ ok: true, payment_intent: pi.id, status: pi.status, mode: 'capture' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
          }
          
          console.log('[CHARGE-BOOKING] Capture did not succeed, status:', pi.status);
          return new Response(JSON.stringify({ ok: false, error: 'Capture did not succeed', status: pi.status }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
        }
      } catch (captureErr) {
        console.log('[CHARGE-BOOKING] Capture error, will try off-session charge:', captureErr);
        // Continue to off-session charge path
      }
    }

    // Off-session charge path using saved payment method
    console.log('[CHARGE-BOOKING] No capturable intent found, trying off-session charge');
    
    if (!booking.stripe_payment_method_id) {
      console.log('[CHARGE-BOOKING] No payment method saved');
      return new Response(JSON.stringify({ ok: false, error: 'No saved payment method' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Determine or create customer and ensure PM is attached
    let customerId = booking.stripe_customer_id || '';
    if (!customerId) {
      console.log('[CHARGE-BOOKING] No customer ID, looking up by email');
      const clientEmail = booking.profiles?.email;
      if (!clientEmail) {
        console.log('[CHARGE-BOOKING] No client email found');
        return new Response(JSON.stringify({ ok: false, error: 'Client email required to charge' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      const existing = await stripe.customers.list({ email: clientEmail, limit: 1 });
      let customer = existing.data[0] || null;
      if (!customer) {
        console.log('[CHARGE-BOOKING] Creating new Stripe customer');
        customer = await stripe.customers.create({ email: clientEmail });
      } else {
        console.log('[CHARGE-BOOKING] Found existing Stripe customer');
      }
      customerId = customer.id;
    }

    console.log('[CHARGE-BOOKING] Using customer:', customerId);

    // Ensure PM is attached to customer
    try {
      const pm = await stripe.paymentMethods.retrieve(booking.stripe_payment_method_id);
      if (!pm.customer) {
        console.log('[CHARGE-BOOKING] Attaching payment method to customer');
        await stripe.paymentMethods.attach(booking.stripe_payment_method_id, { customer: customerId });
      } else {
        console.log('[CHARGE-BOOKING] Payment method already attached');
      }
    } catch (attachErr) {
      console.log('[CHARGE-BOOKING] Error attaching payment method:', attachErr);
      return new Response(JSON.stringify({ ok: false, error: `Unable to attach payment method: ${(attachErr as Error).message}` }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    console.log('[CHARGE-BOOKING] Creating PaymentIntent for off-session charge');
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

    console.log('[CHARGE-BOOKING] PaymentIntent created, status:', intent.status);

    if (intent.status === 'succeeded') {
      console.log('[CHARGE-BOOKING] Payment succeeded, updating database');
      
      // CRITICAL: Automatically change status to 'confirmed' when payment is successful
      // But only if the booking is not 'no_show' (no_show bookings should remain no_show even if paid)
      const statusUpdate = booking.status !== 'no_show' ? { status: 'confirmed' as const } : {};
      
      await supabase
        .from('bookings')
        .update({ 
          payment_status: 'paid', 
          payment_method: 'tarjeta',
          payment_notes: `Cobro automático Stripe PI ${intent.id}`,
          payment_intent_id: intent.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
          ...statusUpdate
        })
        .eq('id', booking_id);

      await supabase.from('business_metrics').insert({
        metric_name: 'payment_processed',
        metric_type: 'revenue',
        metric_value: amount / 100,
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        metadata: { booking_id, action: 'off_session_charge', payment_intent: intent.id, amount_cents: amount, admin_user_id: user.id }
      });

      // Enviar email de cobro exitoso (solo si no es no_show)
      if (!skip_email) {
        try {
          await supabase.functions.invoke('send-booking-with-payment', { 
            body: { booking_id } 
          });
          console.log('[CHARGE-BOOKING] Payment confirmation email sent');
        } catch (emailErr) {
          console.warn('[CHARGE-BOOKING] Email failed but payment succeeded:', emailErr);
        }
      } else {
        console.log('[CHARGE-BOOKING] Skipping email (no_show booking)');
      }

      console.log('[CHARGE-BOOKING] Off-session charge successful');
      return new Response(JSON.stringify({ ok: true, payment_intent: intent.id, status: intent.status, mode: 'charge' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // If requires action / authentication, report back but do not mark paid
    if (intent.status === 'requires_action' || intent.status === 'requires_payment_method' || intent.next_action) {
      console.log('[CHARGE-BOOKING] Payment requires action:', intent.status);
      return new Response(JSON.stringify({ ok: false, requires_action: true, status: intent.status, payment_intent: intent.id, error: 'Payment requires customer authentication' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    console.log('[CHARGE-BOOKING] Payment failed with status:', intent.status);
    return new Response(JSON.stringify({ ok: false, error: `Payment failed with status ${intent.status}`, status: intent.status, payment_intent: intent.id }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[CHARGE-BOOKING] Error:', e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
