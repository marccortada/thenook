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

    // URLs de redirección
    // - PUBLIC_SITE_URL: web principal (thenookmadrid.com)
    // - PUBLIC_APP_URL: app de reservas (thenook.gnerai.com)
    const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://www.thenookmadrid.com";
    const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") || "https://thenook.gnerai.com";

    // Get booking and client email
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, client_id, center_id, centers(name,address,address_zurbaran,address_concha_espina)")
      .eq("id", booking_id)
      .single();
    if (bErr || !booking) throw new Error("Reserva no encontrada");

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("email, first_name, last_name, phone")
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
        phone: profile.phone || undefined,
      });
      customerId = customer.id;
    } else {
      // Update existing customer with phone if available
      if (profile.phone) {
        try {
          await stripe.customers.update(customerId, {
            phone: profile.phone,
          });
        } catch (updateErr) {
          log("WARN: no se pudo actualizar el teléfono del customer", updateErr);
        }
      }
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

    // Include phone in metadata for association
    const clientPhone = profile.phone || undefined;

    // Create Checkout session in setup mode (0€ - solo para guardar tarjeta)
    // Habilitar tarjeta, Apple Pay y Google Pay
    // En modo "setup", el monto es automáticamente 0€ - no se cobra nada
    // NOTA: Google Pay aparece automáticamente si:
    // - El navegador es compatible (Chrome, Safari, Edge)
    // - El dispositivo tiene Google Wallet configurado
    // - La cuenta de Stripe tiene Google Pay habilitado
    // - El dominio está verificado en Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      // Habilitar tarjeta - Apple Pay y Google Pay se muestran automáticamente si están disponibles
      payment_method_types: ["card"],
      locale: "es",
      // Configuración para requerir 3D Secure (confirmación del banco)
      // Esto asegura que la tarjeta solo se guarde después de que el banco confirme
      payment_method_options: {
        card: {
          // Requerir 3D Secure para confirmar con el banco antes de guardar la tarjeta
          request_three_d_secure: 'any', // 'any' = siempre requerir 3D Secure si está disponible
        }
      },
      // REDIRECCIONES:
      // - Éxito: volver a la app de reservas (thenook.gnerai.com) donde se muestra el resultado
      // - Cancelación: volver a la pantalla de asegurar reserva en la app
      success_url: `${publicAppUrl}/pago-configurado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicAppUrl}/asegurar-reserva?booking_id=${booking_id}&cancelled=true`,
      setup_intent_data: {
        metadata: { 
          booking_id, 
          ...centerMeta,
          client_phone: clientPhone || '',
        },
      },
      metadata: { 
        intent: "booking_setup", 
        booking_id, 
        ...centerMeta,
        client_phone: clientPhone || '',
        amount: "0", // Explícitamente indicar que es 0€
      },
    });

    log("Session created with payment methods", { 
      session_id: session.id,
      payment_method_types: session.payment_method_types,
      url: session.url 
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
