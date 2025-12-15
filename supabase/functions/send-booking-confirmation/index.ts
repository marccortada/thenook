import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'The Nook Madrid <reservas@thenookmadrid.com>';
    const internalNotificationEmail = (Deno.env.get('THENOOK_NOTIFICATION_EMAIL') ?? 'reservas@thenookmadrid.com').trim();

    // Utility to extract the email address from the configured FROM string and build a sender name
    const buildSender = (centerName?: string) => {
      const emailMatch = fromEmail.match(/<([^>]+)>/);
      const senderEmail = emailMatch?.[1] || fromEmail;

      // Try to keep only the specific center name, removing "The Nook" and "Madrid" noise
      const cleanedCenter = (centerName || '')
        .replace(/The Nook/gi, '')
        .replace(/Madrid/gi, '')
        .replace(/-\s*/g, ' ')
        .trim();

      const senderName = cleanedCenter ? `The Nook ${cleanedCenter}` : 'The Nook';
      return `${senderName} <${senderEmail}>`;
    };

    // Parse request body to check if a specific booking_id was provided
    let requestBody: any = {};
    try {
      if (req.body) {
        requestBody = await req.json();
      }
    } catch (e) {
      // Ignore JSON parse errors
    }

    const specificBookingId = requestBody?.booking_id;
    console.log(
      '📧 Processing booking confirmation emails...',
      specificBookingId ? `(for booking ${specificBookingId})` : ''
    );

    const nowIso = new Date().toISOString();

    // Build query for pending email notifications
    let query = supabaseClient
      .from('automated_notifications')
      .select(`
        id,
        client_id,
        booking_id,
        subject,
        message,
        type,
        scheduled_for,
        profiles!client_id(email, first_name, last_name),
        bookings(
          booking_datetime,
          total_price_cents,
          services(name),
          centers(name, address, address_concha_espina, address_zurbaran)
        )
      `)
      .eq('status', 'pending')
      .in('type', ['appointment_confirmation', 'booking_reminder', 'booking_confirmation_with_payment'])
      .lte('scheduled_for', nowIso);

    // If a specific booking_id was provided, filter by it
    if (specificBookingId) {
      query = query.eq('booking_id', specificBookingId);
    }

    const { data: notifications, error: fetchError } = await query.limit(10);

    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError);
      throw fetchError;
    }

    if (!notifications || notifications.length === 0) {
      console.log('✅ No pending notifications to send');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Separate payment notifications for different processing
    const paymentNotifications = notifications.filter(n => n.type === 'booking_confirmation_with_payment');
    const regularNotifications = notifications.filter(n => n.type !== 'booking_confirmation_with_payment');

    // Process payment notifications through dedicated function
    if (paymentNotifications.length > 0) {
      console.log(`🔄 Redirecting ${paymentNotifications.length} payment notifications to dedicated function`);
      try {
        const paymentResponse = await supabaseClient.functions.invoke('send-booking-with-payment');
        console.log('✅ Payment notifications redirected successfully');
      } catch (error) {
        console.error('❌ Error redirecting payment notifications:', error);
      }
    }

    // Continue with regular notifications only
    if (regularNotifications.length === 0) {
      console.log('✅ No regular notifications to process');
      return new Response(
        JSON.stringify({ message: 'Payment notifications redirected', processed: paymentNotifications.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📬 Found ${regularNotifications.length} regular notifications to send`);

    let successCount = 0;

    for (const notification of regularNotifications) {
      try {
        const client = notification.profiles;
        const booking = notification.bookings;

        if (!client?.email) {
          console.warn(`⚠️ No email for notification ${notification.id}`);
          await supabaseClient
            .from('automated_notifications')
            .update({ 
              status: 'failed', 
              error_message: 'Cliente sin email',
              sent_at: new Date().toISOString()
            })
            .eq('id', notification.id);
          continue;
        }

        // Determine center location as reliably as possible
        const center = booking?.centers;
        const centerNameLower = center?.name?.toLowerCase() || '';
        const addrZurLower = (center?.address_zurbaran || '').toLowerCase();
        const addrConchaLower = (center?.address_concha_espina || '').toLowerCase();

        // Consider it Zurbarán if the name or any address field clearly points to Zurbarán / 28010
        const isZurbaran =
          center?.address_zurbaran ||
          centerNameLower.includes('zurbaran') ||
          centerNameLower.includes('zurbarán') ||
          addrZurLower.includes('zurbar') ||
          addrZurLower.includes('28010');

        const centerLocation = isZurbaran ? 'ZURBARÁN' : 'CONCHA ESPINA';
        
        // Formatear dirección según el centro
        let formattedAddress = '';
        if (isZurbaran) {
          formattedAddress = center?.address_zurbaran ||
            'C/ Zurbarán 10 (Metro Alonso Martínez / Rubén Darío)';
        } else {
          formattedAddress = center?.address_concha_espina ||
            'C/ Príncipe de Vergara 204 posterior (Metro Concha Espina, salida Plaza de Cataluña)';
        }
        
        const mapsLink = isZurbaran
          ? 'https://maps.app.goo.gl/your-zurbaran-link'
          : 'https://goo.gl/maps/zHuPpdHATcJf6QWX8';

        // Send email using Resend
        const emailSubject = 'Reserva asegurada en THE NOOK';
        
        // Formatear fecha: "viernes 24 de octubre 2025 a las 12:55"
        // Ajuste horario: la fecha en BD está en UTC; sumamos 1h para horario de Madrid (evita que aparezca 1h antes en el email)
        let formattedDateTime = 'Por confirmar';
        if (booking?.booking_datetime) {
          const bookingDate = new Date(booking.booking_datetime);
          // Ajustar explícitamente +1h (UTC -> Madrid) para que coincida con lo que ve el cliente en la web
          bookingDate.setHours(bookingDate.getHours() + 1);
          
          const datePart = bookingDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const timePart = bookingDate.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          });
          formattedDateTime = `${datePart} a las ${timePart}`;
        }
        
        // Usar solo el primer nombre del cliente
        const clientFirstName = client.first_name || '';

        const emailHtml = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Reserva asegurada en THE NOOK</title>
  <style>
    body { margin:0; padding:0; background:#f6f7fb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:#111827; }
    .wrap { width:100%; padding:24px 12px; }
    .card { max-width:640px; margin:0 auto; background:#fff; border-radius:10px; box-shadow:0 6px 18px rgba(16,24,40,0.08); overflow:hidden; }
        /* Encabezado en azul corporativo (no salmón) */
        .header { padding:18px 24px; background:#424CB8; color:#fff; font-weight:700; font-size:18px; letter-spacing:0.3px; }
    .content { padding:22px 24px; line-height:1.6; font-size:15px; }
        a { color:#424CB8; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">THE NOOK</div>
      <div class="content">
        <p>Hola ${clientFirstName}!</p>
        <p>Has reservado correctamente tu tratamiento en <strong>THE NOOK ${centerLocation}</strong>.</p>
        <p><strong>Estos son los detalles de la reserva:</strong></p>
        <p><strong>Tratamiento:</strong> ${booking?.services?.name || 'Servicio personalizado'}</p>
        <p><strong>Fecha:</strong> ${formattedDateTime}</p>
        <p>${formattedAddress}</p>
        <p>Estamos aquí 👉 <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" style="color:#fff !important; text-decoration:none; background:#424CB8; padding:10px 16px; border-radius:8px; font-weight:700;">Ver mapa</a></p>
        <p>Este email es una confirmación de tu reserva. Al efectuar esta reserva aceptas nuestras condiciones de reserva y nuestra Política de Cancelación.</p>
        <p>Es aconsejable llegar al centro cinco minutos antes de la cita. Rogamos máxima puntualidad, al haber otras citas después de la vuestra, si llegáis tarde, quizás no podamos realizar el tratamiento completo.</p>
        <p>En caso de estar embarazada, por favor háznoslo saber con antelación a la cita.</p>
        <p>En este email tienes la dirección del centro reservado, la hora de la cita y el tratamiento elegido. Revisa bien esta información, The Nook no se hace responsable si acudes al centro equivocado o a una hora distinta.</p>
        <p>Te recomendamos leer nuestras condiciones de reserva, compra y cancelación la Política de Cancelación completa aquí:</p>
        <p><a href="https://www.thenookmadrid.com/politica-de-cancelaciones/" target="_blank" rel="noopener noreferrer">https://www.thenookmadrid.com/politica-de-cancelaciones/</a></p>
        <p><strong>THE NOOK ${centerLocation}</strong><br/>
           911 481 474 / 622 360 922<br/>
           <a href="mailto:reservas@thenookmadrid.com">reservas@thenookmadrid.com</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
        `;

        const sender = buildSender(center?.name);

        const sendPromises = [
          resend.emails.send({
            from: sender,
            to: [client.email],
            subject: emailSubject,
            html: emailHtml,
          }),
        ];

        if (internalNotificationEmail) {
          const internalLower = internalNotificationEmail.toLowerCase();
          const clientLower = client.email.toLowerCase();
          if (internalLower !== clientLower) {
            sendPromises.push(
              resend.emails.send({
                from: sender,
                to: [internalNotificationEmail],
                subject: emailSubject,
                html: emailHtml,
              }),
            );
          }
        }

        await Promise.all(sendPromises);
        console.log(`✅ Emails sent for notification ${notification.id} to client ${client.email} and internal copy`);

        // Mark as sent
        await supabaseClient
          .from('automated_notifications')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        successCount++;

      } catch (error) {
        console.error(`❌ Error sending email for notification ${notification.id}:`, error);
        
        await supabaseClient
          .from('automated_notifications')
          .update({ 
            status: 'failed', 
            error_message: error.message,
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);
      }
    }

    console.log(`🎉 Email processing complete: ${successCount}/${regularNotifications.length} successful`);

    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed', 
        processed: regularNotifications.length,
        successful: successCount,
        payment_redirected: paymentNotifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error in send-booking-confirmation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
