import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const resendKey = Deno.env.get("RESEND_API_KEY");

if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY is not configured");
if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
if (!resendKey) throw new Error("RESEND_API_KEY is not configured");

const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
const resend = new Resend(resendKey);

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function sendBookingConfirmationEmail(args: {
  bookingId: string;
  session: Stripe.Checkout.Session;
}) {
  const { bookingId, session } = args;
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select(`
      id,
      booking_datetime,
      duration_minutes,
      total_price_cents,
      payment_status,
      email_status,
      stripe_session_id,
      profiles!client_id ( first_name, last_name, email ),
      services ( name ),
      centers ( name, address_concha_espina, address_zurbaran )
    `)
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("[stripe-webhook] Error fetching booking:", error);
    throw error;
  }
  if (!booking) {
    console.warn("[stripe-webhook] Booking not found for id:", bookingId);
    return;
  }

  const customerDetails = session.customer_details;
  const clientEmail = booking.profiles?.email || customerDetails?.email;
  if (!clientEmail) {
    console.warn("[stripe-webhook] Missing client email for booking:", bookingId);
    return;
  }

  const clientName = [
    booking.profiles?.first_name,
    booking.profiles?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    || customerDetails?.name
    || "Cliente";

  const serviceName =
    booking.services?.name ||
    session.metadata?.service_name ||
    (session as any).display_items?.[0]?.custom?.name ||
    "Tratamiento";

  const bookingDate = booking.booking_datetime
    ? new Date(booking.booking_datetime)
    : null;

  const formattedDate = bookingDate
    ? bookingDate.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Fecha por confirmar";

  const center = booking.centers;
  const centerName = center?.name || "The Nook Madrid";
  const centerAddress =
    center?.address_zurbaran ||
    center?.address_concha_espina ||
    "Consultar en el centro";

  const totalEuros = booking.total_price_cents
    ? (booking.total_price_cents / 100).toFixed(2)
    : null;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; color: #111827;">
      <h1 style="color: #424CB8; margin-bottom: 16px;">Pago confirmado 🎉</h1>
      <p>Hola <strong>${clientName}</strong>,</p>
      <p>Hemos recibido correctamente tu pago y tu reserva queda confirmada.</p>

      <div style="background: #F3F4F6; padding: 18px; border-radius: 10px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Servicio:</strong> ${serviceName}</p>
        <p style="margin: 0 0 8px 0;"><strong>Fecha y hora:</strong> ${formattedDate}</p>
        <p style="margin: 0 0 8px 0;"><strong>Centro:</strong> ${centerName}</p>
        <p style="margin: 0 0 8px 0;"><strong>Dirección:</strong> ${centerAddress}</p>
        ${totalEuros ? `<p style="margin: 0;"><strong>Importe abonado:</strong> ${totalEuros} €</p>` : ""}
      </div>

      <p>Te enviaremos cualquier actualización de tu reserva a <strong>${clientEmail}</strong>.</p>
      <p style="margin-top: 24px;">Gracias por confiar en <strong>The Nook Madrid</strong>. ¡Te esperamos!</p>

      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;" />
      <p style="font-size: 12px; color: #6B7280;">Número de sesión de Stripe: ${session.id}</p>
    </div>
  `;

  const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "reservas@gnerai.com";
  const fromEmail = "The Nook Madrid <reservas@gnerai.com>";

  const alreadyProcessed =
    booking.email_status === "sent" &&
    booking.stripe_session_id === session.id;

  if (alreadyProcessed) {
    console.log("[stripe-webhook] Booking email already sent, skipping:", bookingId);
  } else {
    await resend.emails.send({
      from: fromEmail,
      to: [clientEmail],
      subject: "Confirmación de pago de tu reserva",
      html: emailHtml,
    });

    if (adminEmail) {
      await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        subject: `Pago confirmado · Reserva ${bookingId}`,
        html: emailHtml,
      });
    }
  }

  const updates: Record<string, unknown> = {
    payment_status: "completed",
    stripe_session_id: session.id,
    email_status: "sent",
    email_sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await supabaseAdmin.from("bookings").update(updates).eq("id", bookingId);

  try {
    await supabaseAdmin
      .from("booking_payment_intents")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);
  } catch (intentErr) {
    console.warn("[stripe-webhook] Unable to update booking_payment_intents:", intentErr);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const rawBody = await req.arrayBuffer();
  let event: Stripe.Event;

  try {
    const bodyText = new TextDecoder().decode(new Uint8Array(rawBody));
    event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret);
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const intent =
        session.metadata?.intent ||
        (typeof session.payment_intent !== "string"
          ? (session.payment_intent as Stripe.PaymentIntent).metadata?.intent
          : undefined);

      if (intent === "booking_payment") {
        const payload = session.metadata?.bp_payload;
        if (!payload) {
          console.warn("[stripe-webhook] Missing booking payload in metadata");
        } else {
          const { booking_id } = JSON.parse(payload) as { booking_id: string };
          if (booking_id) {
            await sendBookingConfirmationEmail({
              bookingId: booking_id,
              session,
            });
          } else {
            console.warn("[stripe-webhook] booking_id not found in payload");
          }
        }
      } else {
        console.log("[stripe-webhook] checkout.session.completed ignored for intent:", intent);
      }
    } else {
      console.log("[stripe-webhook] Ignoring event:", event.type);
    }
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err);
    return new Response("Handler error", { status: 500, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ received: true }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
