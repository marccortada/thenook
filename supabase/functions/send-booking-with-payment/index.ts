import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BOOKING-WITH-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize services
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || "", { 
      apiVersion: "2023-10-16" 
    });

    logStep('Services initialized');

    // Get pending booking confirmations with payment
    const { data: notifications, error: fetchError } = await supabaseClient
      .from('automated_notifications')
      .select(`
        id,
        client_id,
        booking_id,
        subject,
        message,
        type,
        scheduled_for,
        metadata,
        profiles!client_id(id, email, first_name, last_name),
        bookings(
          id, 
          booking_datetime, 
          total_price_cents, 
          duration_minutes,
          stripe_setup_intent_id,
          payment_method_status,
          services(name),
          employees(profiles!profile_id(first_name, last_name)),
          centers(name, address_concha_espina, address_zurbaran)
        )
      `)
      .eq('status', 'pending')
      .eq('type', 'booking_confirmation_with_payment')
      .lte('scheduled_for', new Date().toISOString())
      .limit(10);

    if (fetchError) {
      logStep('ERROR fetching notifications', { error: fetchError });
      throw fetchError;
    }

    if (!notifications || notifications.length === 0) {
      logStep('No pending payment notifications to send');
      return new Response(
        JSON.stringify({ message: 'No pending payment notifications', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep(`Found ${notifications.length} payment notifications to process`);

    let successCount = 0;

    for (const notification of notifications) {
      try {
        const client = notification.profiles;
        const booking = notification.bookings;

        if (!client?.email || !booking) {
          logStep(`Skipping notification ${notification.id} - missing client email or booking`);
          await supabaseClient
            .from('automated_notifications')
            .update({ 
              status: 'failed', 
              error_message: 'Cliente sin email o reserva no encontrada',
              sent_at: new Date().toISOString()
            })
            .eq('id', notification.id);
          continue;
        }

        logStep(`Processing notification for booking ${booking.id} - client ${client.email}`);

        // Create or get existing Stripe customer
        let stripeCustomer;
        const existingCustomers = await stripe.customers.list({ 
          email: client.email, 
          limit: 1 
        });

        if (existingCustomers.data.length > 0) {
          stripeCustomer = existingCustomers.data[0];
          logStep(`Found existing Stripe customer`, { customerId: stripeCustomer.id });
        } else {
          stripeCustomer = await stripe.customers.create({
            email: client.email,
            name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
            metadata: {
              booking_id: booking.id,
              source: 'nook_madrid_booking'
            }
          });
          logStep(`Created new Stripe customer`, { customerId: stripeCustomer.id });
        }

        // Create Setup Intent if not exists
        let setupIntent;
        if (booking.stripe_setup_intent_id) {
          logStep(`Retrieving existing setup intent`, { intentId: booking.stripe_setup_intent_id });
          setupIntent = await stripe.setupIntents.retrieve(booking.stripe_setup_intent_id);
        } else {
          logStep(`Creating new setup intent for booking ${booking.id}`);
          setupIntent = await stripe.setupIntents.create({
            customer: stripeCustomer.id,
            payment_method_types: ['card'],
            usage: 'off_session',
            metadata: {
              booking_id: booking.id,
              client_id: client.id,
              amount_cents: booking.total_price_cents?.toString() || '0',
              service: booking.services?.name || 'Tratamiento',
              purpose: 'booking_preauthorization'
            }
          });

          // Update booking with setup intent info
          await supabaseClient
            .from('bookings')
            .update({ 
              stripe_setup_intent_id: setupIntent.id,
              payment_method_status: 'requires_payment_method',
              email_status: 'sending'
            })
            .eq('id', booking.id);

          // Store in payment intents table
          await supabaseClient
            .from('booking_payment_intents')
            .insert({
              booking_id: booking.id,
              stripe_setup_intent_id: setupIntent.id,
              client_secret: setupIntent.client_secret,
              status: setupIntent.status
            });

          logStep(`Setup intent created and stored`, { 
            intentId: setupIntent.id, 
            status: setupIntent.status 
          });
        }

        // Create secure payment URL
        const paymentUrl = `${req.headers.get("origin")}/asegurar-reserva?setup_intent=${setupIntent.id}&client_secret=${setupIntent.client_secret}`;
        
        const employeeName = booking.employees?.profiles ? 
          `${booking.employees.profiles.first_name || ''} ${booking.employees.profiles.last_name || ''}`.trim() :
          'Nuestro equipo';

        // Determine center location
        const center = booking?.centers;
        const isZurbaran = center?.name?.toLowerCase().includes('zurbaran') || center?.name?.toLowerCase().includes('zurbarán');
        const centerLocation = isZurbaran ? 'ZURBARÁN' : 'CONCHA ESPINA';
        const centerAddress = isZurbaran 
          ? (center?.address_zurbaran || 'C. de Zurbarán, 10, bajo dcha, Chamberí, 28010 Madrid')
          : (center?.address_concha_espina || 'C/ Príncipe de Vergara 204 posterior (A la espalda del 204) - Bordeando el Restaurante \'La Ancha\'');
        const centerMetroInfo = isZurbaran
          ? '(Metro Iglesia, salida C. de Zurbarán)'
          : '(Metro Concha Espina, salida Plaza de Cataluña)';
        const mapsLink = isZurbaran
          ? 'https://maps.app.goo.gl/your-zurbaran-link'
          : 'https://goo.gl/maps/zHuPpdHATcJf6QWX8';

        // Send email with payment link
        const emailResponse = await resend.emails.send({
          from: 'The Nook Madrid <reservas@gnerai.com>',
          to: [client.email],
          subject: 'Confirmación de reserva - THE NOOK',
          html: `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Confirmación de reserva - THE NOOK</title>
  <style>
    body { margin:0; padding:0; background-color:#f6f7fb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:#111827; }
    .email-wrap { width:100%; background-color:#f6f7fb; padding:24px 12px; }
    .container { max-width:640px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 6px 18px rgba(16,24,40,0.08); }
    .header { padding:20px 28px; background: linear-gradient(90deg,#424CB8 0%, #3F46B0 100%); color:#fff; }
    .logo { font-weight:700; font-size:18px; letter-spacing:0.4px; }
    .content { padding:24px 28px; line-height:1.5; color:#111827; }
    h1 { margin:0 0 8px 0; font-size:20px; }
    p { margin:10px 0; }
    .details { background:#f8fafc; border-radius:8px; padding:14px; margin:14px 0; }
    .btn { display:inline-block; text-decoration:none; padding:12px 18px; border-radius:8px; background:#424CB8; color:#fff; font-weight:600; }
    .small { font-size:13px; color:#6b7280; }
    .footer { padding:18px 28px; font-size:13px; color:#6b7280; border-top:1px solid #eef2ff; }
    a { color:#424CB8; }
    .muted { color:#6b7280; font-size:13px; }
    .contact-row { margin-top:12px; }
    .payment-box { background:#fef3c7; border-left:4px solid #f59e0b; padding:16px; border-radius:8px; margin:16px 0; }
    @media (max-width:480px){
      .content{padding:18px;}
      .header{padding:16px;}
    }
  </style>
</head>
<body>
  <div class="email-wrap">
    <div class="container" role="article" aria-roledescription="email">
      <div class="header">
        <div class="logo">THE NOOK</div>
      </div>

      <div class="content">
        <h1>Hola <strong>${client.first_name || ''} ${client.last_name || ''}</strong>!</h1>
        <p>Has reservado correctamente tu tratamiento en <strong>THE NOOK</strong>. A continuación tienes los detalles de la reserva:</p>

        <div class="details" aria-labelledby="det-title">
          <p id="det-title" style="margin:0 0 8px 0;"><strong>Servicios reservados</strong></p>
          <p style="margin:6px 0;"><strong>Tratamiento:</strong> ${booking.services?.name || 'Servicio personalizado'}</p>
          <p style="margin:6px 0;"><strong>Fecha y hora:</strong> ${
            booking.booking_datetime 
              ? new Date(booking.booking_datetime).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Por confirmar'
          }</p>
          <p style="margin:6px 0;"><strong>Centro:</strong> THE NOOK ${centerLocation}</p>
          <p style="margin:6px 0;"><strong>Precio:</strong> ${
            booking.total_price_cents 
              ? `${(booking.total_price_cents / 100).toFixed(2)}€`
              : 'A confirmar'
          }</p>
        </div>

        <div class="payment-box">
          <p style="margin:0 0 10px 0; font-weight:600; color:#92400e;">🔒 Asegura tu reserva con tu tarjeta</p>
          <p style="margin:0 0 10px 0; font-size:14px; color:#78350f;">
            Para confirmar tu reserva, necesitamos que introduzcas los datos de tu tarjeta. <strong>No se realizará ningún cargo hasta el momento del tratamiento.</strong>
          </p>
          <p style="margin:12px 0 0 0; text-align:center;">
            <a class="btn" href="${paymentUrl}" target="_blank" rel="noopener noreferrer">🔒 Asegurar mi Reserva</a>
          </p>
        </div>

        <p>
          Dirección:<br>
          ${centerAddress}<br>
          ${centerMetroInfo}
        </p>

        <p>
          Estamos aquí: <a href="${mapsLink}" target="_blank" rel="noopener noreferrer">${mapsLink}</a>
        </p>

        <p class="small">
          Este email es una confirmación de tu reserva. Al efectuar esta reserva aceptas nuestras condiciones de uso y nuestra Política de Cancelación.
        </p>

        <p class="muted">
          Es aconsejable llegar al centro cinco minutos antes de la cita. Rogamos máxima puntualidad: al haber otras citas después de la vuestra, si llegáis tarde, quizás no podamos realizaros el tratamiento completo.
        </p>

        <p class="muted">
          En caso de estar embarazada, por favor háznoslo saber con antelación a la cita.
        </p>

        <p class="muted">
          En este email tienes la dirección del centro reservado, la hora de la cita y el tratamiento elegido. Revisa bien esta información por si hubiera algún error — The Nook no se hace responsable si acudes al centro equivocado o a una hora distinta a la reservada.
        </p>

        <p>
          Te recomendamos leer la Política de Cancelación: <a href="https://www.thenookmadrid.com/politica-de-cancelaciones/" target="_blank" rel="noopener noreferrer">Política de Cancelaciones de THE NOOK</a>
        </p>

        <p style="margin-top:18px;">
          <a class="btn" href="${mapsLink}" target="_blank" rel="noopener noreferrer">Ver ubicación en el mapa</a>
        </p>

        <div class="contact-row">
          <p style="margin:8px 0 2px 0;"><strong>Contacto</strong></p>
          <p class="small" style="margin:2px 0;">
            Tel: <a href="tel:+34911481474">911 481 474</a> / <a href="tel:+34622360922">622 360 922</a><br>
            Email: <a href="mailto:reservas@thenookmadrid.com">reservas@thenookmadrid.com</a>
          </p>
        </div>
      </div>

      <div class="footer">
        <p style="margin:0 0 6px 0;">THE NOOK ${centerLocation}</p>
        <p style="margin:0;" class="small">Si tienes alguna duda o necesitas modificar tu reserva, contacta con nosotros lo antes posible.</p>
      </div>
    </div>
  </div>
</body>
</html>
          `,
        });

        logStep(`Email sent successfully`, { emailId: emailResponse.id });

        // Mark notification as sent and update booking
        await Promise.all([
          supabaseClient
            .from('automated_notifications')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', notification.id),
          
          supabaseClient
            .from('bookings')
            .update({ 
              email_sent_at: new Date().toISOString(),
              email_status: 'sent'
            })
            .eq('id', booking.id)
        ]);

        successCount++;
        logStep(`Booking ${booking.id} processed successfully`);

      } catch (error) {
        logStep(`ERROR processing notification ${notification.id}`, { error: error.message });
        
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

    logStep(`Processing complete: ${successCount}/${notifications.length} successful`);

    return new Response(
      JSON.stringify({ 
        message: 'Payment notifications processed', 
        processed: notifications.length,
        successful: successCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('FATAL ERROR', { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});