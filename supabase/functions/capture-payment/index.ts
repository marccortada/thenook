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
    const { reserva_id, amount_to_capture } = await req.json();
    if (!reserva_id) {
      return new Response(JSON.stringify({ ok: false, error: 'reserva_id is required' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2023-10-16' });
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');

    const { data: reserva, error } = await supabase
      .from('reservas')
      .select('id, importe_total, stripe_payment_intent_id')
      .eq('id', reserva_id)
      .maybeSingle();
    if (error) throw error;
    if (!reserva?.stripe_payment_intent_id) {
      return new Response(JSON.stringify({ ok: false, error: 'Stripe PaymentIntent no asociado a la reserva' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const captureParams: Record<string, any> = {};
    if (typeof amount_to_capture === 'number' && amount_to_capture > 0) {
      captureParams.amount_to_capture = Math.round(amount_to_capture);
    }

    const pi = await stripe.paymentIntents.capture(
      reserva.stripe_payment_intent_id,
      captureParams,
      { idempotencyKey: `capture-${reserva_id}-${captureParams.amount_to_capture ?? 'full'}` }
    );

    const total = reserva.importe_total;
    const amountReceived = pi.amount_received || 0;
    const estado = amountReceived >= total ? 'capturado_total' : 'capturado_parcial';

    await supabase.from('reservas').update({ estado_reserva: estado, importe_capturado: amountReceived, amount_capturable: pi.amount_capturable }).eq('id', reserva_id);
    await supabase.from('logs_pagos').insert({ reserva_id, evento: 'admin.capture', payload: { amount_to_capture: captureParams.amount_to_capture ?? 'full', pi } });

    return new Response(JSON.stringify({ ok: true, payment_intent: pi.id, status: pi.status, amount_received: amountReceived }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { headers: { ...cors, 'Content-Type': 'application/json' }, status: 200 });
  }
});

