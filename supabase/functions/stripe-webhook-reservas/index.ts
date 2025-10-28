import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function log(msg: string, extra?: unknown) {
  console.log(`[stripe-webhook-reservas] ${msg}`, extra ?? "");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
    // Permite usar un secreto específico para este endpoint sin romper otros webhooks
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_RESERVAS')
      || Deno.env.get('STRIPE_WEBHOOK_SECRET')
      || '';
    if (!stripeSecret || !webhookSecret) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing Stripe secrets' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' });
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const sig = req.headers.get('stripe-signature');
    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig as string, webhookSecret);
    } catch (err) {
      log('Invalid signature', err);
      return new Response(JSON.stringify({ ok: false, error: 'Invalid signature' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const writeLog = async (reserva_id: string | null, evento: string, payload: unknown) => {
      try {
        await supabase.from('logs_pagos').insert({ reserva_id, evento, payload });
      } catch (_e) { /* ignore */ }
    };

    switch (event.type) {
      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object as Stripe.PaymentIntent;
        log('amount_capturable_updated', { id: pi.id, amount_capturable: pi.amount_capturable });
        const reservaId = (pi.metadata as any)?.reserva_id || null;
        await supabase.from('reservas')
          .update({ amount_capturable: pi.amount_capturable, stripe_payment_method_id: pi.payment_method as string || null, stripe_customer_id: (pi.customer as string) || null })
          .eq('stripe_payment_intent_id', pi.id);
        await writeLog(reservaId, event.type, event);
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const manual = pi.capture_method === 'manual';
        const reservaId = (pi.metadata as any)?.reserva_id || null;
        const estado = manual ? 'retenido' : 'capturado_total';
        log('payment_intent.succeeded', { id: pi.id, manual });
        await supabase.from('reservas')
          .update({
            estado_reserva: estado,
            stripe_payment_method_id: (pi.payment_method as string) || null,
            stripe_customer_id: (pi.customer as string) || null,
            amount_capturable: pi.amount_capturable,
            importe_capturado: pi.amount_received || 0,
          })
          .eq('stripe_payment_intent_id', pi.id);
        await writeLog(reservaId, event.type, event);
        break;
      }
      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const reservaId = (pi.metadata as any)?.reserva_id || null;
        await supabase.from('reservas')
          .update({ estado_reserva: 'cancelado' })
          .eq('stripe_payment_intent_id', pi.id);
        await writeLog(reservaId, event.type, event);
        break;
      }
      case 'payment_method.attached': {
        const pm = event.data.object as Stripe.PaymentMethod;
        const customer = pm.customer as string | null;
        log('payment_method.attached', { pm: pm.id, customer });
        if (customer) {
          // Vincular en reservas si conocíamos el cliente por customer
          await supabase.from('reservas')
            .update({ stripe_payment_method_id: pm.id })
            .eq('stripe_customer_id', customer);
          // Y persistir en clientes
          await supabase.from('clientes')
            .update({ stripe_customer_id: customer })
            .or(`stripe_customer_id.is.null,email.eq.${pm.billing_details?.email || ''}`);
        }
        await writeLog(null, event.type, event);
        break;
      }
      default:
        await writeLog(null, event.type, event);
        break;
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    log('Unhandled error', e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
