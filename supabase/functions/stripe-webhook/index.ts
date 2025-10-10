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

  const rawLanguage = (session.metadata?.language || session.locale || "").toLowerCase();
  const language = rawLanguage.startsWith("en") ? "en" : "es";
  const isSpanish = language === "es";
  const langAttr = isSpanish ? "es" : "en";
  const dateLocale = isSpanish ? "es-ES" : "en-GB";

  const formattedDate = bookingDate
    ? bookingDate.toLocaleString(dateLocale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : isSpanish
      ? "Fecha por confirmar"
      : "Date to be confirmed";

  const serviceDisplay = serviceName || (isSpanish ? "Tratamiento" : "Treatment");

  const center = booking.centers;
  const centerName = center?.name || "";
  const isZurbaran = centerName.toLowerCase().includes("zurbar");
  const centerHeading = isZurbaran ? "THE NOOK ZURBARÁN" : "THE NOOK CONCHA ESPINA";
  const mapLink = isZurbaran
    ? "https://maps.app.goo.gl/fEWyBibeEFcQ3isN6"
    : "https://goo.gl/maps/zHuPpdHATcJf6QWX8";
  const addressLineEs = isZurbaran
    ? "C/ Zurbarán 10 (Metro Alonso Martínez / Rubén Darío)"
    : "C/ Príncipe de Vergara 204 posterior (A la espalda del 204) - Bordeando el Restaurante 'La Ancha' (Metro Concha Espina salida Plaza de Cataluña)";
  const addressLineEn = isZurbaran
    ? "C/ Zurbarán 10 (Metro Alonso Martínez / Rubén Darío)"
    : "C/ Príncipe de Vergara 204 back building (At the back of #204 - walking around the restaurant 'La Ancha') Subway: Concha Espina exit Plaza de Cataluña";

  const subject = isSpanish
    ? "Reserva asegurada en THE NOOK"
    : "Booking confirmed at THE NOOK";

  const cancellationLink = "https://www.thenookmadrid.com/politica-de-cancelaciones/";
  const year = new Date().getFullYear();

  const spanishBody = `
    <p>Hola <strong>${clientName}</strong>!</p>
    <p>Has reservado correctamente tu tratamiento en ${centerHeading}.</p>
    <p>Estos son los detalles de la reserva:</p>
    <ul style="list-style:none; padding:0; margin:0 0 16px 0;">
      <li><strong>Tratamiento:</strong> ${serviceDisplay}</li>
      <li><strong>Fecha:</strong> ${formattedDate}</li>
    </ul>
    <p>${addressLineEs}</p>
    <p>Estamos aquí 👉 <a href="${mapLink}" style="color:#1A6AFF;">Ver mapa</a></p>
    <p>Este email es una confirmación de tu reserva. Al efectuar esta reserva aceptas nuestras condiciones de uso y nuestra <a href="${cancellationLink}" style="color:#1A6AFF;">Política de Cancelación</a>.</p>
    <p>Es aconsejable llegar al centro cinco minutos antes de la cita. Rogamos máxima puntualidad, al haber otras citas después de la vuestra, si llegáis tarde, quizás no podamos realizar el tratamiento completo.</p>
    <p>En caso de estar embarazada, por favor háznoslo saber con antelación a la cita.</p>
    <p>En este email tienes la dirección del centro reservado, la hora de la cita y el tratamiento elegido. Revisa bien esta información, ya que The Nook no se hace responsable si acudes al centro equivocado o a una hora distinta.</p>
    <p>Te recomendamos leer la Política de Cancelación completa aquí:<br><a href="${cancellationLink}" style="color:#1A6AFF;">${cancellationLink}</a></p>
    <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
    <p><strong>${centerHeading}</strong><br>
    911 481 474 / 622 360 922<br>
    <a href="mailto:reservas@thenookmadrid.com" style="color:#1A6AFF;">reservas@thenookmadrid.com</a></p>
  `;

  const englishBody = `
    <p>Hi <strong>${clientName}</strong>!</p>
    <p>Your booking is confirmed at ${centerHeading}.</p>
    <p>These are the details of your appointment:</p>
    <ul style="list-style:none; padding:0; margin:0 0 16px 0;">
      <li><strong>Treatment:</strong> ${serviceDisplay}</li>
      <li><strong>Date:</strong> ${formattedDate}</li>
    </ul>
    <p>${addressLineEn}</p>
    <p>We are here 👉 <a href="${mapLink}" style="color:#1A6AFF;">View map</a></p>
    <p>This email confirms your reservation. By booking with us, you accept our conditions and our <a href="${cancellationLink}" style="color:#1A6AFF;">Cancellation Policy</a>.</p>
    <p>Please arrive five minutes before your appointment. If you’re late, we may have to shorten your treatment as there are other bookings after yours.</p>
    <p>Please let us know in advance if you are pregnant.</p>
    <p>In this email you have all the information regarding your booking (date, time and address). Please check it carefully — The Nook won’t take responsibility if you go to the wrong address or at a different time.</p>
    <p>We encourage you to read our full cancellation policy here:<br><a href="${cancellationLink}" style="color:#1A6AFF;">${cancellationLink}</a></p>
    <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
    <p><strong>${centerHeading}</strong><br>
    911 481 474 / 622 360 922<br>
    <a href="mailto:reservas@thenookmadrid.com" style="color:#1A6AFF;">reservas@thenookmadrid.com</a></p>
  `;

  const contentBody = isSpanish ? spanishBody : englishBody;

  const emailHtml = `
<!doctype html>
<html lang="${langAttr}">
  <head>
    <meta charset="utf-8">
    <title>${subject}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>

  <body style="margin:0; padding:0; font-family:Arial,Helvetica,sans-serif; background:#f8f9fb; color:#111;">
    <center style="width:100%; background:#f8f9fb;">
      <table role="presentation" width="100%" style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; box-shadow:0 3px 10px rgba(0,0,0,0.08); border-collapse:separate;">
        <tr>
          <td style="background:linear-gradient(135deg,#424CB8,#1A6AFF); color:#fff; text-align:center; padding:24px; border-radius:12px 12px 0 0;">
            <h1 style="margin:0; font-size:22px;">
              ${isSpanish ? "Reserva asegurada en THE NOOK" : "Booking confirmed at THE NOOK"}
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            ${contentBody}
          </td>
        </tr>
      </table>

      <p style="font-size:11px; color:#9ca3af; margin:20px auto; max-width:600px;">
        © ${year} THE NOOK Madrid — ${isSpanish ? "Este correo se ha generado automáticamente." : "This email was generated automatically."}<br>
        ${isSpanish ? "Si no hiciste esta reserva, por favor contáctanos." : "If you did not make this booking, please contact us."}
      </p>
    </center>
  </body>
</html>
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
      subject,
      html: emailHtml,
    });

    if (adminEmail) {
      await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        subject: `${subject} · Reserva ${bookingId}`,
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
