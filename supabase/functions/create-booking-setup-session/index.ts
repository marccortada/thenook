import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateBookingSetupBody {
  booking_id: string;
}

const log = (step: string, details?: any) => {
  console.log(`[CREATE-BOOKING-SETUP] ${step}`, details ?? "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id } = (await req.json()) as CreateBookingSetupBody;
    if (!booking_id) throw new Error("Falta booking_id");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Falta STRIPE_SECRET_KEY en Supabase Secrets");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const origin = req.headers.get("origin") || "https://example.com";

    // Get booking and client email
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, client_id, center_id, centers(name,address,address_zurbaran,address_concha_espina)")
      .eq("id", booking_id)
      .single();
    if (bErr || !booking) throw new Error("Reserva no encontrada");

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", booking.client_id)
      .single();
    if (pErr || !profile?.email) throw new Error("Email del cliente no disponible");

    // Find or create Stripe customer
    const list = await stripe.customers.list({ email: profile.email, limit: 1 });
    let customerId = list.data[0]?.id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || undefined,
      });
      customerId = customer.id;
    }

    // Persist Stripe customer on the booking for futuras operaciones
    try {
      await supabase
        .from("bookings")
        .update({ stripe_customer_id: customerId })
        .eq("id", booking_id);
    } catch (persistErr) {
      log("WARN: no se pudo guardar stripe_customer_id en booking", persistErr);
    }

    const centerMeta = {
      center_id: booking.center_id || undefined,
      center_name: booking.centers?.name || undefined,
      center_address:
        booking.centers?.address_zurbaran ||
        booking.centers?.address ||
        booking.centers?.address_concha_espina ||
        undefined,
    };

    // Create Checkout session in setup mode
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      success_url: `${origin}/pago-configurado`,
      cancel_url: `${origin}/asegurar-reserva?booking_id=${booking_id}`,
      setup_intent_data: {
        metadata: { booking_id, ...centerMeta },
      },
      metadata: { intent: "booking_setup", booking_id, ...centerMeta },
    });

    log("Session created", { id: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    log("ERROR", { message: err.message });
    return new Response(JSON.stringify({ error: err.message || "Error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
