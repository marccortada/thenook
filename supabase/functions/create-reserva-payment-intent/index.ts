import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  cliente: { email: string; nombre?: string; telefono?: string };
  reserva: {
    servicio_id?: string;
    fecha?: string; // ISO
    importe_total: number; // céntimos
    payment_method_id: string; // del Payment Element (stripe.createPaymentMethod)
    extended_authorizations?: boolean; // si true y la fecha > 7 días, usar SetupIntent
  };
};

function isBeyond7Days(iso?: string) {
  if (!iso) return false;
  const fecha = new Date(iso);
  const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  return fecha.getTime() > in7.getTime();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2023-10-16' });
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');

    const body = (await req.json()) as Body;
    const { cliente, reserva } = body || {} as Body;
    if (!cliente?.email || !reserva?.importe_total || !reserva?.payment_method_id) {
      return new Response(JSON.stringify({ ok: false, error: 'Campos requeridos: cliente.email, reserva.importe_total, reserva.payment_method_id' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 1) Upsert cliente
    const { data: cliByEmail } = await supabase.from('clientes').select('*').eq('email', cliente.email.toLowerCase()).maybeSingle();
    let clienteId = cliByEmail?.id as string | undefined;
    let stripeCustomerId = cliByEmail?.stripe_customer_id as string | undefined;

    if (!stripeCustomerId) {
      // Buscar en Stripe por email
      const existing = await stripe.customers.list({ email: cliente.email.toLowerCase(), limit: 1 });
      let customer = existing.data[0];
      if (!customer) {
        customer = await stripe.customers.create({ email: cliente.email.toLowerCase(), name: cliente.nombre || undefined, phone: cliente.telefono || undefined });
      }
      stripeCustomerId = customer.id;
    }

    if (!clienteId) {
      const { data: inserted } = await supabase
        .from('clientes')
        .insert({ nombre: cliente.nombre || null, email: cliente.email.toLowerCase(), telefono: cliente.telefono || null, stripe_customer_id: stripeCustomerId })
        .select('id')
        .single();
      clienteId = inserted?.id;
    } else if (stripeCustomerId && cliByEmail?.stripe_customer_id !== stripeCustomerId) {
      await supabase.from('clientes').update({ stripe_customer_id: stripeCustomerId }).eq('id', clienteId);
    }

    // 2) Crear reserva fila base
    const { data: reservaRow } = await supabase
      .from('reservas')
      .insert({
        cliente_id: clienteId || null,
        servicio_id: reserva.servicio_id || null,
        fecha: reserva.fecha || null,
        importe_total: Math.round(reserva.importe_total),
        stripe_customer_id: stripeCustomerId,
      })
      .select('id')
      .single();
    const reservaId = reservaRow?.id as string;

    // 3) Si extended y >7 días, usar SetupIntent para guardar tarjeta y cobrar el día del servicio
    const useSetupIntent = !!reserva.extended_authorizations && isBeyond7Days(reserva.fecha);
    if (useSetupIntent) {
      const si = await stripe.setupIntents.create({
        customer: stripeCustomerId!,
        payment_method_types: ['card'],
        usage: 'off_session',
        payment_method: reserva.payment_method_id,
        metadata: { reserva_id: reservaId },
        confirm: true,
      });
      await supabase.from('reservas').update({ stripe_setup_intent_id: si.id, stripe_payment_method_id: reserva.payment_method_id }).eq('id', reservaId);
      await supabase.from('logs_pagos').insert({ reserva_id: reservaId, evento: 'setup_intent.created', payload: si });
      return new Response(JSON.stringify({ ok: true, reserva_id: reservaId, setup_intent: si.id, status: si.status }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 4) Crear PaymentIntent con retención manual y guardado de tarjeta
    const idempotencyKey = `reserva-${reservaId}-${Math.round(reserva.importe_total)}`;
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(reserva.importe_total),
      currency: 'eur',
      customer: stripeCustomerId!,
      payment_method: reserva.payment_method_id,
      capture_method: 'manual',
      confirm: true,
      setup_future_usage: 'off_session',
      metadata: { reserva_id: reservaId },
    }, { idempotencyKey });

    await supabase.from('reservas').update({ stripe_payment_intent_id: pi.id, stripe_payment_method_id: reserva.payment_method_id }).eq('id', reservaId);
    await supabase.from('logs_pagos').insert({ reserva_id: reservaId, evento: 'payment_intent.created', payload: { id: pi.id, status: pi.status } });

    return new Response(JSON.stringify({ ok: true, reserva_id: reservaId, payment_intent: pi.id, client_secret: pi.client_secret, status: pi.status }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { headers: { ...cors, 'Content-Type': 'application/json' }, status: 200 });
  }
});

