import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const buildSender = (centerName?: string) => {
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'The Nook Madrid <reservas@thenookmadrid.com>';
  const emailMatch = fromEmail.match(/<([^>]+)>/);
  const senderEmail = emailMatch?.[1] || fromEmail;

  const cleanedCenter = (centerName || '')
    .replace(/The Nook/gi, '')
    .replace(/Madrid/gi, '')
    .replace(/-\s*/g, ' ')
    .trim();

  const senderName = cleanedCenter ? `The Nook ${cleanedCenter}` : 'The Nook';
  return `${senderName} <${senderEmail}>`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'The Nook Madrid <reservas@thenookmadrid.com>';

    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'booking_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get booking data
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        center_id,
        booking_datetime,
        duration_minutes,
        total_price_cents,
        payment_status,
        status,
        profiles!client_id ( first_name, last_name, email ),
        services ( name, center_id ),
        centers ( name, address, address_concha_espina, address_zurbaran )
      `)
      .eq('id', booking_id)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Booking not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // No enviar correo si el booking es un no_show
    if (booking.status === 'no_show') {
      return new Response(
        JSON.stringify({ ok: true, message: 'Skipped no_show booking' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientEmail = booking.profiles?.email;
    if (!clientEmail) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Client has no email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const clientName = [
      booking.profiles?.first_name,
      booking.profiles?.last_name,
    ].filter(Boolean).join(' ') || 'Cliente';

    const serviceName = booking.services?.name || 'Tratamiento';

    const bookingDateTime = booking.booking_datetime
      ? DateTime.fromISO(booking.booking_datetime, { zone: 'utc' }).setZone('Europe/Madrid')
      : null;

    const isSpanish = true; // Por defecto español
    const formattedDate = bookingDateTime
      ? bookingDateTime.setLocale('es').toFormat("EEEE d 'de' MMMM yyyy 'a las' HH:mm")
      : 'Fecha por confirmar';

    // Resolve center
    const center = booking.centers as any;
    const centerNameLower = (center?.name || '').toLowerCase();
    const baseAddress = (center?.address || '').toLowerCase();
    const addrZurLower = (center?.address_zurbaran || '').toLowerCase();
    const addrConchaLower = (center?.address_concha_espina || '').toLowerCase();

    const hasZurbaranAddress =
      (!!center?.address_zurbaran && addrZurLower.length > 0) ||
      baseAddress.includes('zurbar') ||
      baseAddress.includes('28010');
    const hasConchaAddress =
      (!!center?.address_concha_espina && addrConchaLower.length > 0) ||
      baseAddress.includes('concha') ||
      baseAddress.includes('vergara') ||
      baseAddress.includes('28002') ||
      baseAddress.includes('204');

    const nameHintsZurbaran = centerNameLower.includes('zurbar');
    const nameHintsConcha = centerNameLower.includes('concha') || centerNameLower.includes('vergara');

    let isZurbaran = false;
    if (nameHintsZurbaran) {
      isZurbaran = true;
    } else if (nameHintsConcha) {
      isZurbaran = false;
    } else if (hasZurbaranAddress && !hasConchaAddress) {
      isZurbaran = true;
    } else if (!hasZurbaranAddress && hasConchaAddress) {
      isZurbaran = false;
    }

    const hasLocationInName = centerNameLower.includes('zurbar') || centerNameLower.includes('concha');
    const normalizedName = hasLocationInName && center?.name
      ? center.name
      : (isZurbaran ? 'ZURBARÁN' : 'CONCHA ESPINA');
    const centerHeading = `THE NOOK ${normalizedName}`.trim();

    const mapLink = isZurbaran
      ? 'https://maps.app.goo.gl/fEWyBibeEFcQ3isN6'
      : 'https://goo.gl/maps/zHuPpdHATcJf6QWX8';

    const addressLineEs = isZurbaran
      ? center?.address_zurbaran || center?.address || 'C/ Zurbarán 10 (Metro Alonso Martínez / Rubén Darío)'
      : center?.address_concha_espina || center?.address || 'C/ Príncipe de Vergara 204 posterior (A la espalda del 204) - Bordeando el Restaurante \'La Ancha\' (Metro Concha Espina salida Plaza de Cataluña)';

    const subject = 'Reserva confirmada en THE NOOK';
    const cancellationLink = 'https://www.thenookmadrid.com/politica-de-cancelaciones/';
    const year = new Date().getFullYear();

    const spanishBody = `<p>Hola ${clientName}!</p>
<p>Has reservado correctamente tu tratamiento en <strong>${centerHeading}</strong>.</p>
<p><strong>Estos son los detalles de la reserva:</strong></p>
<p><strong>Tratamiento:</strong> ${serviceName}<br/>
<strong>Fecha:</strong> ${formattedDate}</p>
<p><strong>Dirección:</strong><br>${addressLineEs}</p>
<p>Estamos aquí 👉 <a href="${mapLink}" target="_blank" style="color:#fff !important; text-decoration:none; background:#424CB8; padding:10px 16px; border-radius:8px; font-weight:700; display:inline-block;">Ver ubicación en el mapa</a></p>
<p>Este email es una confirmación de tu reserva. Al efectuar esta reserva aceptas nuestras condiciones de reserva y nuestra Política de Cancelación.</p>
<p>Es aconsejable llegar al centro cinco minutos antes de la cita. Rogamos máxima puntualidad, al haber otras citas después de la vuestra, si llegáis tarde, quizás no podamos realizar el tratamiento completo.</p>
<p>En caso de estar embarazada, por favor háznoslo saber con antelación a la cita.</p>
<p>En este email tienes la dirección del centro reservado, la hora de la cita y el tratamiento elegido. Revisa bien esta información, The Nook no se hace responsable si acudes al centro equivocado o a una hora distinta.</p>
<p>Te recomendamos leer nuestras condiciones de reserva, compra y cancelación en la Política de Cancelación completa aquí:<br><a href="${cancellationLink}" style="color:#1A6AFF;">${cancellationLink}</a></p>
<hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
<p><strong>${centerHeading}</strong><br>
911 481 474 / 622 360 922<br>
<a href="mailto:reservas@thenookmadrid.com" style="color:#1A6AFF;">reservas@thenookmadrid.com</a></p>`;

    const emailHtml = `<!doctype html>
<html lang="es">
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
<h1 style="margin:0; font-size:22px;">Reserva confirmada en THE NOOK</h1>
</td>
</tr>
<tr>
<td style="padding:24px;">
${spanishBody}
</td>
</tr>
</table>
<p style="font-size:11px; color:#9ca3af; margin:20px auto; max-width:600px;">
© ${year} THE NOOK Madrid — Este correo se ha generado automáticamente.<br>
Si no hiciste esta reserva, por favor contáctanos.
</p>
</center>
</body>
</html>`;

    const sender = buildSender(centerHeading);

    await resend.emails.send({
      from: sender,
      to: [clientEmail],
      subject: subject,
      html: emailHtml,
    });

    // Update email_status
    await supabaseAdmin
      .from('bookings')
      .update({ email_status: 'sent' })
      .eq('id', booking_id);

    return new Response(
      JSON.stringify({ ok: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending manual booking confirmation:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Failed to send email' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

