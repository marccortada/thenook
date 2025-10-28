import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function minAmount(cents: number | null | undefined) {
  const n = typeof cents === "number" ? Math.round(cents) : 0;
  return Math.max(50, n);
}

function normalizePhone(raw?: string | null, fallbackCode = "+34") {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) return digits;
  return `${fallbackCode}${digits}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { booking_id, amount_cents, phone } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ ok: false, error: "booking_id is required" }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ ok: false, error: "STRIPE_SECRET_KEY not configured" }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Load booking and client profile
    const { data: bkg, error } = await supabase
      .from('bookings')
      .select('id, total_price_cents, services(name), profiles!client_id(email, first_name, last_name, phone)')
      .eq('id', booking_id)
      .maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!bkg) {
      return new Response(JSON.stringify({ ok: false, error: 'Booking not found' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const amount = minAmount(typeof amount_cents === 'number' ? amount_cents : (bkg.total_price_cents || 0));
    const currency = 'eur';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency,
          product_data: { name: `Pago de reserva${bkg.services?.name ? ` - ${bkg.services.name}` : ''}` },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: bkg.profiles?.email || undefined,
      payment_intent_data: { metadata: { intent: 'booking_payment', booking_id } },
      metadata: { intent: 'booking_payment', booking_id },
      success_url: (Deno.env.get('PUBLIC_SITE_URL') || 'https://www.thenookmadrid.com') + '/pago-exitoso?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: Deno.env.get('PUBLIC_SITE_URL') || 'https://www.thenookmadrid.com',
    }).catch((err) => {
      if (err?.code === 'amount_too_small') {
        throw new Error('El monto mínimo para pagos con Stripe es €0.50');
      }
      throw err;
    });

    const url = session.url || (session.client_secret ? `https://checkout.stripe.com/c/pay/${session.client_secret}` : null);
    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: 'Unable to create checkout URL' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Try to send SMS via Twilio if configured
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    const defaultCountry = Deno.env.get('DEFAULT_COUNTRY_CODE') || '+34';
    let sms_sent = false;
    let sms_error: string | null = null;
    const targetPhone = normalizePhone(phone || bkg.profiles?.phone, defaultCountry);

    if (accountSid && authToken && fromNumber && targetPhone) {
      const body = `Hola, te enviamos el enlace para pagar tu cita en The Nook Madrid. Importe ${(amount/100).toFixed(2)}€\n\n${url}`;
      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: fromNumber, To: targetPhone, Body: body }),
      });
      if (resp.ok) sms_sent = true; else sms_error = await resp.text();
    }

    return new Response(JSON.stringify({ ok: true, url, sms_sent, sms_error }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});

