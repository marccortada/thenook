import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DateTime } from "https://esm.sh/luxon@3.4.4?target=deno";

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
const internalNotificationEmail = (Deno.env.get("THENOOK_NOTIFICATION_EMAIL") ?? "reservas@thenookmadrid.com").trim();

const sendWithInternalCopy = async (payload: any) => {
  const toField = payload.to;
  const toList = Array.isArray(toField) ? toField : [toField];
  const sendPromises = [resend.emails.send(payload)];

  if (internalNotificationEmail) {
    const internalLower = internalNotificationEmail.toLowerCase();
    const alreadyIncluded = toList.some((addr) => (addr || "").toLowerCase() === internalLower);
    if (!alreadyIncluded) {
      sendPromises.push(
        resend.emails.send({
          ...payload,
          to: [internalNotificationEmail],
        }),
      );
    }
  }

  await Promise.all(sendPromises);
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

interface PackageVoucherItemPayload {
  package_id: string;
  quantity?: number;
  is_gift?: boolean;
  recipient_name?: string;
  recipient_email?: string;
  gift_message?: string;
}
interface PackageVoucherPayload {
  items: PackageVoucherItemPayload[];
  purchaser_name?: string;
  purchaser_email?: string;
  purchaser_phone?: string;
  is_gift?: boolean;
  recipient_name?: string;
  recipient_email?: string;
  gift_message?: string;
  notes?: string;
}

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

  const bookingDateTime = booking.booking_datetime
    ? DateTime.fromISO(booking.booking_datetime, { zone: "utc" }).setZone("Europe/Madrid")
    : null;

  const rawLanguage = (session.metadata?.language || session.locale || "").toLowerCase();
  const language = rawLanguage.startsWith("en") ? "en" : "es";
  const isSpanish = language === "es";
  const langAttr = isSpanish ? "es" : "en";
  const formattedDate = bookingDateTime
    ? bookingDateTime
        .setLocale(isSpanish ? "es" : "en")
        .toFormat(isSpanish ? "EEEE d 'de' MMMM yyyy 'a las' HH:mm" : "EEEE, MMMM d, yyyy 'at' HH:mm")
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
    <a href="mailto:reservas@gnerai.com" style="color:#1A6AFF;">reservas@gnerai.com</a></p>
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
    <a href="mailto:reservas@gnerai.com" style="color:#1A6AFF;">reservas@gnerai.com</a></p>
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
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "The Nook Madrid <reservas@gnerai.com>";

  const alreadyProcessed =
    booking.email_status === "sent" &&
    booking.stripe_session_id === session.id;

  if (alreadyProcessed) {
    console.log("[stripe-webhook] Booking email already sent, skipping:", bookingId);
  } else {
    await sendWithInternalCopy({
      from: fromEmail,
      to: [clientEmail],
      subject,
      html: emailHtml,
    });

    if (adminEmail) {
      await sendWithInternalCopy({
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

async function processPackageVoucher(args: {
  session: Stripe.Checkout.Session;
  payload: PackageVoucherPayload;
}) {
  const { session, payload } = args;

  const items = payload.items || [];
  if (!items.length) {
    console.warn("[stripe-webhook] package_voucher without items");
    return;
  }

  const packageIds = Array.from(new Set(items.map((it) => it.package_id).filter(Boolean)));
  if (!packageIds.length) {
    console.warn("[stripe-webhook] No valid package ids in payload");
    return;
  }

  const { data: existingMatch } = await supabaseAdmin
    .from("client_packages")
    .select("id")
    .ilike("notes", `%${session.id}%`)
    .maybeSingle();
  if (existingMatch) {
    console.log("[stripe-webhook] vouchers already processed for session", session.id);
    return;
  }

  const { data: packagesData, error: packagesError } = await supabaseAdmin
    .from("packages")
    .select("id,name,price_cents,sessions_count,center_id,active,centers(name,address_concha_espina,address_zurbaran)")
    .in("id", packageIds);
  if (packagesError) {
    console.error("[stripe-webhook] error fetching packages:", packagesError);
    throw packagesError;
  }

  const packageMap = new Map<string, any>();
  for (const pkg of packagesData || []) {
    packageMap.set(pkg.id, pkg);
  }

  const sessionCustomer = session.customer_details;
  const purchaserName = (payload.purchaser_name || sessionCustomer?.name || "Cliente").trim();
  const purchaserEmail =
    (payload.purchaser_email || sessionCustomer?.email || "").trim().toLowerCase();

  if (!purchaserEmail) {
    console.warn("[stripe-webhook] purchaser email missing, cannot create voucher");
    return;
  }

  const globalRecipientName = payload.recipient_name?.trim();
  const globalRecipientEmail =
    payload.recipient_email?.trim().toLowerCase() || undefined;
  const globalGiftMessage = payload.gift_message?.trim();
  const isGiftGlobal = payload.is_gift ?? items.some((it) => it.is_gift);
  const noteBase = payload.notes?.trim();

  const createdVouchers: Array<{
    code: string;
    package: any;
    recipientEmail: string;
    recipientName: string;
    giftMessage?: string;
    purchaserEmail: string;
    purchaserName: string;
    isGift: boolean;
  }> = [];

  for (const item of items) {
    const pkg = item.package_id ? packageMap.get(item.package_id) : null;
    if (!pkg || !pkg.active) {
      console.warn("[stripe-webhook] package not available:", item.package_id);
      continue;
    }

    const quantity = Math.max(1, item.quantity ?? 1);
    const itemIsGift = item.is_gift ?? isGiftGlobal;
    const recipientName =
      (item.recipient_name || globalRecipientName || (itemIsGift ? "" : purchaserName)).trim() ||
      purchaserName;

    const recipientEmail =
      (item.recipient_email?.trim().toLowerCase() ||
        globalRecipientEmail ||
        (itemIsGift ? undefined : purchaserEmail)) ?? purchaserEmail;

    const giftMessage = item.gift_message ?? globalGiftMessage ?? "";

    let profileId: string | undefined;
    try {
      const { data: existingProfile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", recipientEmail)
        .maybeSingle();
      if (profileErr) throw profileErr;

      if (existingProfile?.id) {
        profileId = existingProfile.id;
      } else {
        const [first, ...rest] = recipientName.split(" ");
        const { data: createdProfile, error: createProfileErr } = await supabaseAdmin
          .from("profiles")
          .insert({
            email: recipientEmail,
            first_name: first || recipientName,
            last_name: rest.join(" ") || null,
            phone: payload.purchaser_phone || null,
            role: "client",
          })
          .select("id")
          .single();
        if (createProfileErr) throw createProfileErr;
        profileId = createdProfile.id;
      }
    } catch (profileErr) {
      console.error("[stripe-webhook] error ensuring profile:", profileErr);
      continue;
    }

    for (let i = 0; i < quantity; i++) {
      try {
        const { data: code, error: codeErr } = await supabaseAdmin.rpc("generate_voucher_code");
        if (codeErr) throw codeErr;

        const notesPieces = [
          noteBase,
          giftMessage ? `Mensaje: ${giftMessage}` : "",
          itemIsGift ? `Regalo para: ${recipientName} <${recipientEmail}>` : "Uso personal",
          `Comprador: ${purchaserName} <${purchaserEmail}>`,
          `Stripe session: ${session.id}`,
        ].filter(Boolean);

        const { data: createdPackage, error: createPkgErr } = await supabaseAdmin
          .from("client_packages")
          .insert({
            client_id: profileId,
            package_id: pkg.id,
            purchase_price_cents: pkg.price_cents,
            total_sessions: pkg.sessions_count,
            voucher_code: code,
            notes: notesPieces.join(" | "),
            status: "active",
          })
          .select("id,voucher_code")
          .single();
        if (createPkgErr) throw createPkgErr;

        createdVouchers.push({
          code: createdPackage.voucher_code,
          package: pkg,
          recipientEmail,
          recipientName,
          giftMessage: giftMessage || undefined,
          purchaserEmail,
          purchaserName,
          isGift: itemIsGift,
        });
      } catch (voucherErr) {
        console.error("[stripe-webhook] error creating voucher:", voucherErr);
      }
    }
  }

  if (!createdVouchers.length) {
    console.warn("[stripe-webhook] No vouchers created for session", session.id);
    return;
  }

  const year = new Date().getFullYear();
  const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "reservas@gnerai.com";
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "The Nook Madrid <reservas@gnerai.com>";

  for (const voucher of createdVouchers) {
    const pkg = voucher.package;
    const centerName = pkg.centers?.name || "";
    const isZurbaran = centerName.toLowerCase().includes("zurbar");
    const location = isZurbaran ? "ZURBARÁN" : "CONCHA ESPINA";
    const mapLink = isZurbaran
      ? "https://maps.app.goo.gl/fEWyBibeEFcQ3isN6"
      : "https://goo.gl/maps/zHuPpdHATcJf6QWX8";
    const address = isZurbaran
      ? pkg.centers?.address_zurbaran || "C/ Zurbarán 10 (Metro Alonso Martínez / Rubén Darío)"
      : pkg.centers?.address_concha_espina ||
        "C/ Príncipe de Vergara 204 posterior (A la espalda del 204) - Bordeando el Restaurante 'La Ancha' (Metro Concha Espina salida Plaza de Cataluña)";

    const giftBlock = voucher.giftMessage
      ? `<p style="margin:0 0 16px 0; color:#0f172a;"><strong>Mensaje:</strong> ${voucher.giftMessage}</p>`
      : "";

    const emailHtml = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Bono confirmado — THE NOOK</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>

  <body style="margin:0; padding:0; font-family:Arial,Helvetica,sans-serif; background:#f8f9fb; color:#111;">
    <center style="width:100%; background:#f8f9fb;">
      <table role="presentation" width="100%" style="max-width:600px; margin:auto; background:white; border-radius:12px; box-shadow:0 3px 10px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#424CB8,#1A6AFF); color:#fff; text-align:center; padding:24px; border-radius:12px 12px 0 0;">
            <h1 style="margin:0; font-size:22px;">🎟️ Bono asegurado en THE NOOK</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:24px;">
            <p>Hola <strong>${voucher.recipientName}</strong>!</p>
            <p>Hemos registrado tu <strong>${pkg.name}</strong> en <strong>THE NOOK ${location}</strong>.</p>

            <p>Estos son los detalles de tu bono:</p>
            <ul style="list-style:none; padding-left:0;">
              <li><strong>Bono:</strong> ${pkg.name}</li>
              <li><strong>Número de sesiones:</strong> ${pkg.sessions_count}</li>
              <li><strong>Código único:</strong> <span style="font-size:16px; font-weight:bold; color:#1A6AFF;">${voucher.code}</span></li>
            </ul>

            ${giftBlock}

            <div style="margin:18px 0; padding:12px 16px; background:#f3f6ff; border-radius:8px; border:1px solid #e2e8ff;">
              <p style="margin:0; font-size:14px; color:#0f172a;">
                🪙 <strong>Cómo funciona:</strong><br>
                Este código es personal e intransferible.<br>
                Cada vez que vengas al centro y canjees tu bono, se actualizará automáticamente tu saldo restante (por ejemplo: 5/5 → 4/5 → 3/5…).<br>
                Cuando llegues a 0/${pkg.sessions_count}, el bono quedará completado.
              </p>
            </div>

            <p>Podrás usar tu bono en nuestro centro de <strong>${location}</strong>:</p>
            <p>${address}</p>
            <p>Estamos aquí 👉 <a href="${mapLink}" target="_blank" style="color:#1A6AFF;">Ver mapa</a></p>

            <p>Este email es una confirmación de tu compra. Al adquirir este bono, aceptas nuestras condiciones de uso y nuestra <a href="https://www.thenookmadrid.com/politica-de-cancelaciones/" target="_blank" style="color:#1A6AFF;">Política de Cancelación</a>.</p>

            <p>Te recomendamos leer la política completa aquí:<br>
              <a href="https://www.thenookmadrid.com/politica-de-cancelaciones/" target="_blank" style="color:#1A6AFF;">https://www.thenookmadrid.com/politica-de-cancelaciones/</a>
            </p>

            <hr style="border:none; border-top:1px solid #eee; margin:20px 0;">
            <p><strong>THE NOOK ${location}</strong><br>
              911 481 474 / 622 360 922<br>
              <a href="mailto:reservas@gnerai.com" style="color:#1A6AFF;">reservas@gnerai.com</a>
            </p>

          </td>
        </tr>
      </table>

      <p style="font-size:11px; color:#9ca3af; margin:20px auto; max-width:600px;">
        © ${year} THE NOOK Madrid — Este correo se ha generado automáticamente.<br>
        Si no realizaste esta compra, por favor contáctanos.
      </p>
    </center>
  </body>
</html>
`;

    await sendWithInternalCopy({
      from: fromEmail,
      to: [voucher.recipientEmail],
      subject: `Tu bono ${pkg.name} en THE NOOK`,
      html: emailHtml,
    });

    if (voucher.purchaserEmail && voucher.purchaserEmail !== voucher.recipientEmail) {
      await sendWithInternalCopy({
        from: fromEmail,
        to: [voucher.purchaserEmail],
        subject: `Confirmación de compra · ${pkg.name}`,
        html: emailHtml,
      });
    }
  }

  if (adminEmail) {
    const summaryHtml = `
      <div style="font-family: Arial, sans-serif;">
        <h3>🎁 Nueva compra de bonos</h3>
        <p><strong>Comprador:</strong> ${createdVouchers[0].purchaserName} &lt;${createdVouchers[0].purchaserEmail}&gt;</p>
        <p><strong>Total:</strong> ${createdVouchers.length} bono(s)</p>
        <ul>
          ${createdVouchers
            .map(
              (v) =>
                `<li>${v.package.name} — Código: <code>${v.code}</code> — Para: ${v.recipientName} (${v.recipientEmail})</li>`
            )
            .join("")}
        </ul>
        <p>Sesión Stripe: ${session.id}</p>
      </div>
    `;

    await sendWithInternalCopy({
      from: fromEmail,
      to: [adminEmail],
      subject: `Nueva compra de bono · ${createdVouchers[0].package.name}`,
      html: summaryHtml,
    });
  }
}

// Procesar tarjetas de regalo
async function processGiftCards(args: {
  session: Stripe.Checkout.Session;
  items: any[];
}) {
  const { session, items } = args;

  if (!items || !items.length) {
    console.warn("[stripe-webhook] gift_cards without items");
    return;
  }

  // Verificar si ya se procesó esta sesión
  const { data: existingMatch } = await supabaseAdmin
    .from("gift_cards")
    .select("id")
    .ilike("purchased_by_email", `%${session.customer_details?.email || ""}%`)
    .eq("initial_balance_cents", items[0].amount_cents)
    .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // últimos 5 minutos
    .maybeSingle();

  if (existingMatch) {
    console.log("[stripe-webhook] gift cards already processed for session", session.id);
    return;
  }

  const cloudinaryCloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME")?.trim();
  const cloudinaryTemplateId =
    Deno.env.get("CLOUDINARY_GIFT_CARD_TEMPLATE")?.trim() || "template_ukdzku.jpg";

  const encodeCloudinaryText = (value: string) =>
    encodeURIComponent(
      (value ?? "")
        .replace(/\r?\n/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );

  const buildCloudinaryUrls = (
    card: {
      title: string;
      code: string;
      amountCents: number;
      showPrice: boolean;
      giftMessage?: string;
    },
    purchaseDate: string,
  ) => {
    if (!cloudinaryCloudName) return null;

    const amountSuffix = card.showPrice
      ? ` · ${(card.amountCents / 100).toFixed(2)}€`
      : "";
    const overlayTitle = encodeCloudinaryText(`${card.title}${amountSuffix}`);
    const overlayCode = encodeCloudinaryText(card.code);
    const overlayDate = encodeCloudinaryText(purchaseDate.replace(/\//g, "-"));
    const giftMessageRaw = (card.giftMessage ?? "").trim();
    const overlayGiftMessage = giftMessageRaw ? encodeCloudinaryText(giftMessageRaw) : null;

    const transforms = [
      "f_auto,q_auto",
      `l_text:Helvetica_Neue_35_bold:${overlayTitle},co_rgb:4a4a4a,g_center,y_-210`,
    ];

    if (overlayGiftMessage) {
      transforms.push(`l_text:Helvetica_Neue_28:${overlayGiftMessage},co_rgb:4a4a4a,g_center,y_-160`);
    }

    transforms.push(
      `l_text:Helvetica_Neue_30_bold:${overlayCode},co_rgb:4a4a4a,g_center,y_210`,
      `l_text:Helvetica_Neue_28_bold:${overlayDate},co_rgb:4a4a4a,g_center,y_135`,
    );

    const baseTransform = transforms.join("/");

    return {
      imageUrl: `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${baseTransform}/${cloudinaryTemplateId}`,
      downloadUrl: `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${baseTransform}/fl_attachment/${cloudinaryTemplateId}`,
    };
  };

  const fetchCloudinaryImage = async (url: string, code: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error("[stripe-webhook] Cloudinary fetch failed", {
          status: response.status,
          statusText: response.statusText,
        });
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return {
        dataUrl: `data:${contentType};base64,${base64}`,
        attachment: {
          filename: `gift-card-${code}.${contentType.includes("png") ? "png" : "jpg"}`,
          content: base64,
          contentType,
        },
      };
    } catch (err) {
      console.error("[stripe-webhook] Cloudinary fetch error", err);
      return null;
    }
  };

  const sessionCustomer = session.customer_details;
  const createdGiftCards: Array<{
    code: string;
    amount_cents: number;
    recipientEmail: string;
    recipientName: string;
    giftCardName: string;
    giftMessage?: string;
    purchaserEmail: string;
    purchaserName: string;
    isGift: boolean;
    showPrice: boolean;
    sendToBuyer: boolean;
    showBuyerData: boolean;
  }> = [];

  for (const item of items) {
    const purchaserName = (item.purchased_by_name || sessionCustomer?.name || "Cliente").trim();
    const purchaserEmail = (item.purchased_by_email || sessionCustomer?.email || "").trim().toLowerCase();

    if (!purchaserEmail) {
      console.warn("[stripe-webhook] purchaser email missing for gift card");
      continue;
    }

    const isGift = item.is_gift || false;
    const recipientName = (item.recipient_name || purchaserName).trim();
    const recipientEmail = (item.recipient_email || purchaserEmail).trim().toLowerCase();
    const giftMessage = item.gift_message?.trim() || "";
    const showPrice = item.show_price ?? true;
    const sendToBuyer = item.send_to_buyer ?? true;
    const showBuyerData = item.show_buyer_data ?? true;
    const giftCardName =
      (item.card_name || item.gift_card_name || item.name || "").toString().trim() ||
      recipientName ||
      purchaserName ||
      "Tarjeta Regalo";

    // Obtener o crear perfil del beneficiario
    let profileId: string | undefined;
    try {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", recipientEmail)
        .maybeSingle();

      if (existingProfile?.id) {
        profileId = existingProfile.id;
      } else {
        const [first, ...rest] = recipientName.split(" ");
        const { data: createdProfile, error: createProfileErr } = await supabaseAdmin
          .from("profiles")
          .insert({
            email: recipientEmail,
            first_name: first || recipientName,
            last_name: rest.join(" ") || null,
            role: "client",
          })
          .select("id")
          .single();
        if (createProfileErr) throw createProfileErr;
        profileId = createdProfile.id;
      }
    } catch (profileErr) {
      console.error("[stripe-webhook] error ensuring profile for gift card:", profileErr);
      continue;
    }

    const quantity = item.quantity ?? 1;
    for (let i = 0; i < quantity; i++) {
      try {
        const { data: code, error: codeErr } = await supabaseAdmin.rpc("generate_voucher_code");
        if (codeErr) throw codeErr;

        const notes = [
          isGift ? `Regalo de: ${purchaserName} <${purchaserEmail}>` : "Compra personal",
          isGift && giftMessage ? `Mensaje: ${giftMessage}` : "",
          `Stripe session: ${session.id}`,
        ]
          .filter(Boolean)
          .join(" | ");

        const { data: createdCard, error: createErr } = await supabaseAdmin
          .from("gift_cards")
          .insert({
            code,
            initial_balance_cents: item.amount_cents,
            remaining_balance_cents: item.amount_cents,
            assigned_client_id: profileId,
            purchased_by_name: purchaserName,
            purchased_by_email: purchaserEmail,
            status: "active",
          })
          .select("id,code")
          .single();

        if (createErr) throw createErr;

        createdGiftCards.push({
          code: createdCard.code,
          amount_cents: item.amount_cents,
          recipientEmail,
          recipientName,
          giftCardName,
          giftMessage: giftMessage || undefined,
          purchaserEmail,
          purchaserName,
          isGift,
          showPrice,
          sendToBuyer,
          showBuyerData,
        });
      } catch (cardErr) {
        console.error("[stripe-webhook] error creating gift card:", cardErr);
      }
    }
  }

  if (!createdGiftCards.length) {
    console.warn("[stripe-webhook] No gift cards created for session", session.id);
    return;
  }

  console.log(`[stripe-webhook] 📧 Preparing ${createdGiftCards.length} gift card emails...`);
  const year = new Date().getFullYear();
  const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "reservas@gnerai.com";
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "The Nook Madrid <reservas@gnerai.com>";

  for (const card of createdGiftCards) {
    const amountFormatted = new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(card.amount_cents / 100);
    const purchaseDate = new Date()
      .toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
      .replace(/\//g, "-");

    const urls = buildCloudinaryUrls(
      {
        title: card.giftCardName,
        code: card.code,
        amountCents: card.amount_cents,
        showPrice: card.showPrice,
        giftMessage: card.giftMessage,
      },
      purchaseDate,
    );

    let imageSrc: string | null = null;
    let downloadUrl: string | null = urls?.downloadUrl ?? null;
    let attachment: { filename: string; content: string; contentType: string } | null = null;

    if (urls) {
      const cloudinaryImage = await fetchCloudinaryImage(urls.imageUrl, card.code);
      if (cloudinaryImage) {
        imageSrc = cloudinaryImage.dataUrl || urls.imageUrl;
        attachment = cloudinaryImage.attachment;
        downloadUrl = urls.downloadUrl ?? downloadUrl;
      } else {
        imageSrc = urls.imageUrl;
      }
    } else {
      console.warn("[stripe-webhook] Cloudinary config missing; email will be sent without image", {
        hasCloudinaryCloudName: Boolean(cloudinaryCloudName),
        template: cloudinaryTemplateId,
      });
    }

    const sendToBuyer = card.sendToBuyer !== false;
    const purchaserEmail = card.purchaserEmail;
    const recipientEmail = card.recipientEmail;
    const primaryEmail = sendToBuyer ? purchaserEmail : recipientEmail;

    if (!primaryEmail) {
      console.warn("[stripe-webhook] Missing primary email for gift card", {
        code: card.code,
        sendToBuyer,
        purchaserEmail,
        recipientEmail,
      });
      continue;
    }

    const primaryName = sendToBuyer ? card.purchaserName : card.recipientName;
    const safePrimaryName = (primaryName || "Cliente").trim();
    const amountLineVisible = card.showPrice !== false;
    const cardTitleLine = card.giftCardName
      ? `<p style="font-size:18px;font-weight:600;margin:16px 0 8px;color:#4a4a4a;">${card.giftCardName}</p>`
      : "";
    const priceLine = amountLineVisible
      ? `<p style="margin:10px 0 0;font-size:16px;font-weight:600;color:#4a4a4a;">Valor: ${amountFormatted}</p>`
      : "";
    const buyerInfoLine =
      card.isGift && !sendToBuyer && card.showBuyerData
        ? `<p style="font-size:14px;color:#4a4a4a;margin:8px 0;">De parte de: <strong>${card.purchaserName}</strong></p>`
        : "";
    const imageBlock = imageSrc
      ? `<div style="margin:24px 0;text-align:center;"><img src="${imageSrc}" alt="Tarjeta regalo The Nook Madrid" style="max-width:100%;border-radius:12px;box-shadow:0 10px 30px rgba(26,106,255,0.1);" /></div>`
      : "";
    const downloadBlock = downloadUrl
      ? `<div style="margin:24px 0;text-align:center;"><a href="${downloadUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;">Descargar tarjeta</a></div>`
      : "";

    const isGift = card.isGift;
    const introLine = isGift
      ? sendToBuyer
        ? "Aquí tienes tu tarjeta regalo lista para que la compartas cuando quieras."
        : `Has recibido una tarjeta regalo de <strong>${card.purchaserName || "alguien especial"}</strong>.`
      : "Gracias por tu compra de tarjeta regalo.";

    const recipientHtml = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Tarjeta Regalo - The Nook Madrid</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:#f8f9fb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#4a4a4a;">
    <center style="width:100%;background:#f8f9fb;">
      <table role="presentation" width="100%" style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 10px 35px rgba(15,23,42,0.08);border-collapse:separate;">
        <tr>
          <td style="background:linear-gradient(135deg,#424CB8,#1A6AFF);color:#ffffff;text-align:center;padding:28px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;font-size:24px;">🎁 Tarjeta Regalo The Nook Madrid</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p>Hola <strong>${safePrimaryName}</strong>!</p>
            <p>${introLine}</p>
            ${buyerInfoLine}
            ${cardTitleLine}
            <div style="background:#f3f4f6;border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;color:#4a4a4a;">Tu código de tarjeta regalo:</p>
              <p style="margin:0;font-size:32px;font-weight:700;color:#4a4a4a;letter-spacing:6px;">${card.code}</p>
              ${priceLine}
              <p style="font-size:13px;color:#4a4a4a;margin:8px 0 0;">Fecha de compra: ${purchaseDate}</p>
            </div>
            ${imageBlock}
            ${downloadBlock}
            <div style="background:#f0f9ff;border-radius:12px;padding:20px;margin:24px 0;">
              <h3 style="margin-top:0;color:#4a4a4a;font-size:18px;">¿Cómo usar tu tarjeta regalo?</h3>
              <ol style="margin:0;padding-left:20px;color:#4a4a4a;font-size:14px;line-height:1.6;">
                <li>Reserva tu cita llamando al <strong>911 481 474</strong> o mandando un WhatsApp al <strong>622 360 922</strong>.</li>
                <li>Este es el código de tu Tarjeta Regalo, <strong>${card.code}</strong>, introdúcelo al reservar online o comunícalo si lo haces por teléfono o por WhatsApp.</li>
                <li>Disfruta de tu experiencia en The Nook.</li>
              </ol>
            </div>
            <p style="font-size:13px;color:#4a4a4a;">Si necesitas ayuda, escríbenos a <a href="mailto:reservas@thenookmadrid.com" style="color:#4a4a4a;">reservas@thenookmadrid.com</a>.</p>
            <p style="font-size:13px;color:#4a4a4a;margin-top:12px;">Reservas: 911 481 474 / 622 360 922</p>
          </td>
        </tr>
      </table>
      <p style="font-size:11px;color:#4a4a4a;margin:20px auto 0;">© ${year} THE NOOK Madrid — Este correo se ha generado automáticamente.</p>
    </center>
  </body>
</html>
    `;

    const recipientSubject = isGift
      ? sendToBuyer
        ? `🎁 Tu tarjeta regalo de The Nook Madrid (para ${card.recipientName || "regalar"})`
        : `🎁 ¡Has recibido ${card.giftCardName} de ${card.purchaserName || "alguien especial"}!`
      : `Tu ${card.giftCardName} de The Nook Madrid`;

    const recipientEmailPayload: any = {
      from: fromEmail,
      to: [primaryEmail],
      subject: recipientSubject,
      html: recipientHtml,
    };

    if (attachment) {
      recipientEmailPayload.attachments = [
        {
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
        },
      ];
    }

    console.log("[stripe-webhook] Sending primary gift card email", {
      to: primaryEmail,
      code: card.code,
      sendToBuyer,
    });
    await sendWithInternalCopy(recipientEmailPayload);

    const shouldSendBuyerCopy =
      isGift &&
      !sendToBuyer &&
      purchaserEmail &&
      purchaserEmail.toLowerCase() !== (recipientEmail || "").toLowerCase();

    if (shouldSendBuyerCopy) {
      const recipientDisplayName = (card.recipientName || "la persona destinataria").trim();
      const recipientEmailLabel = recipientEmail ? ` (${recipientEmail})` : "";
      const purchaserHtml = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Confirmación Tarjeta Regalo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:#f8f9fb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#4a4a4a;">
    <center style="width:100%;background:#f8f9fb;">
      <table role="presentation" width="100%" style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 10px 35px rgba(15,23,42,0.08);border-collapse:separate;">
        <tr>
          <td style="background:linear-gradient(135deg,#1FA16A,#0EA5E9);color:#4a4a4a;text-align:center;padding:26px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;font-size:22px;">✅ Confirmación de envío</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p>Hola <strong>${card.purchaserName}</strong>!</p>
            <p>Hemos enviado la tarjeta regalo a <strong>${recipientDisplayName}</strong>${recipientEmailLabel}.</p>
            ${cardTitleLine}
            <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:24px 0;">
              <h3 style="margin-top:0;color:#4a4a4a;font-size:16px;">Resumen del regalo</h3>
              <p style="margin:6px 0;color:#4a4a4a;"><strong>Código:</strong> ${card.code}</p>
              ${amountLineVisible ? `<p style="margin:6px 0;color:#4a4a4a;"><strong>Valor:</strong> ${amountFormatted}</p>` : ""}
              <p style="margin:6px 0;color:#4a4a4a;"><strong>Fecha de compra:</strong> ${purchaseDate}</p>
              <p style="margin:6px 0;color:#4a4a4a;"><strong>Destinatario:</strong> ${recipientDisplayName}${recipientEmailLabel}</p>
            </div>
            ${imageBlock}
            ${downloadBlock}
            <p style="font-size:13px;color:#4a4a4a;">Te hemos adjuntado la tarjeta por si deseas reenviarla manualmente.</p>
            <p style="font-size:13px;color:#4a4a4a;">Gracias por confiar en The Nook Madrid.</p>
          </td>
        </tr>
      </table>
      <p style="font-size:11px;color:#4a4a4a;margin:20px auto 0;">© ${year} THE NOOK Madrid — Este correo se ha generado automáticamente.</p>
    </center>
  </body>
</html>
      `;

      const purchaserPayload: any = {
        from: fromEmail,
        to: [purchaserEmail],
        subject: "Confirmación: Tarjeta regalo enviada",
        html: purchaserHtml,
      };

      if (attachment) {
        purchaserPayload.attachments = [
          {
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.contentType,
          },
        ];
      }

      console.log("[stripe-webhook] Sending purchaser confirmation email", {
        to: purchaserEmail,
        code: card.code,
      });
      await sendWithInternalCopy(purchaserPayload);
    }
  }

  if (adminEmail) {
    const summaryHtml = `
      <div style="font-family: Arial, sans-serif;">
        <h3>🎁 Nueva compra de Tarjeta(s) Regalo</h3>
        <p><strong>Comprador:</strong> ${createdGiftCards[0].purchaserName} &lt;${createdGiftCards[0].purchaserEmail}&gt;</p>
        <p><strong>Total:</strong> ${createdGiftCards.length} tarjeta(s)</p>
        <ul>
          ${createdGiftCards
            .map((c) => {
              const amt = new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
              }).format(c.amount_cents / 100);
              return `<li>${c.giftCardName} — ${amt} — Código: <code>${c.code}</code> — ${c.isGift ? `Para: ${c.recipientName} (${c.recipientEmail})` : "Compra personal"}</li>`;
            })
            .join("")}
        </ul>
        <p>Sesión Stripe: ${session.id}</p>
      </div>
    `;

    console.log(`[stripe-webhook] Sending admin summary to: ${adminEmail}`);
    await sendWithInternalCopy({
      from: fromEmail,
      to: [adminEmail],
      subject: `Nueva compra Tarjeta Regalo · ${createdGiftCards[0].purchaserName}`,
      html: summaryHtml,
    });
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
    event = await stripe.webhooks.constructEventAsync(
      bodyText,
      signature,
      webhookSecret,
    );
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`[stripe-webhook] Received event: ${event.type}`);
    
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[stripe-webhook] Session ID: ${session.id}`);
      console.log(`[stripe-webhook] Session metadata:`, JSON.stringify(session.metadata, null, 2));
      
      const intent =
        session.metadata?.intent ||
        (typeof session.payment_intent !== "string"
          ? (session.payment_intent as Stripe.PaymentIntent).metadata?.intent
          : undefined);

      console.log(`[stripe-webhook] Detected intent: ${intent}`);

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
      } else if (intent === "booking_setup") {
        // Flow: setup mode to only save payment method (no immediate charge)
        // booking_id can come in metadata or inside the SetupIntent
        let bookingIdFromMeta = session.metadata?.booking_id as string | undefined;
        try {
          if (!bookingIdFromMeta && session.setup_intent) {
            if (typeof session.setup_intent === 'string') {
              // Retrieve the SetupIntent to read metadata
              const si = await stripe.setupIntents.retrieve(session.setup_intent);
              bookingIdFromMeta = (si.metadata as any)?.booking_id as string | undefined;
              console.log('[stripe-webhook] Retrieved SetupIntent metadata booking_id:', bookingIdFromMeta);
            } else {
              const siObj = session.setup_intent as Stripe.SetupIntent;
              bookingIdFromMeta = (siObj.metadata as any)?.booking_id as string | undefined;
            }
          }
        } catch (e) {
          console.warn('[stripe-webhook] Could not read SetupIntent metadata:', e);
        }
        if (bookingIdFromMeta) {
          await sendBookingConfirmationEmail({ bookingId: bookingIdFromMeta, session });
        } else {
          console.warn('[stripe-webhook] booking_setup without booking_id in metadata');
        }
      } else if (intent === "package_voucher") {
        const payloadRaw = session.metadata?.pv_payload;
        if (!payloadRaw) {
          console.warn("[stripe-webhook] Missing package voucher payload in metadata");
        } else {
          await processPackageVoucher({
            session,
            payload: JSON.parse(payloadRaw) as PackageVoucherPayload,
          });
        }
      } else if (intent === "gift_cards") {
        console.log("[stripe-webhook] 🎁 Processing gift cards...");
        const payloadRaw = session.metadata?.gc_payload;
        if (!payloadRaw) {
          console.warn("[stripe-webhook] Missing gift cards payload in metadata");
        } else {
          console.log("[stripe-webhook] Gift cards payload:", payloadRaw);
          const parsed = JSON.parse(payloadRaw);
          console.log("[stripe-webhook] Parsed items:", JSON.stringify(parsed.items, null, 2));
          await processGiftCards({
            session,
            items: parsed.items || [],
          });
          console.log("[stripe-webhook] ✅ Gift cards processed successfully");
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
