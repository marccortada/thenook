import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from "https://esm.sh/stripe@14.21.0";
import { Resend } from "npm:resend@2.0.0";

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

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || "", { 
      apiVersion: "2023-10-16" 
    });
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'The Nook Madrid <reservas@gnerai.com>';
    const internalNotificationEmail = (Deno.env.get('THENOOK_NOTIFICATION_EMAIL') ?? 'reservas@thenookmadrid.com').trim();

    logStep('Services initialized');

    // If booking_id is provided in body, send immediate confirmation emails (client + admin)
    try {
      const body = await req.json().catch(() => null);
      const bookingId = body?.booking_id as string | undefined;
      if (bookingId) {
        logStep('Immediate email path for booking_id', { bookingId });

        const { data: bookingRow, error: bookingErr } = await supabaseClient
          .from('bookings')
          .select(`
            id, booking_datetime, total_price_cents,
            services(name),
            centers(name, address, address_concha_espina, address_zurbaran),
            profiles!client_id(email, first_name, last_name)
          `)
          .eq('id', bookingId)
          .maybeSingle();

        if (bookingErr || !bookingRow) {
          logStep('Booking not found for immediate email', { error: bookingErr?.message });
          return new Response(
            JSON.stringify({ ok: false, error: 'Booking not found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          );
        }

        const client = bookingRow.profiles;
        if (!client?.email) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Client has no email' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        const center = bookingRow.centers;
        // Determinar correctamente el centro usando tanto el nombre como los campos de dirección específicos
        const centerNameLower = center?.name?.toLowerCase() || '';
        const addrBaseLower = (center?.address || '').toLowerCase();
        const addrZurLower = (center?.address_zurbaran || '').toLowerCase();

        const isZurbaran =
          center?.address_zurbaran ||
          centerNameLower.includes('zurbaran') ||
          centerNameLower.includes('zurbarán') ||
          addrZurLower.includes('zurbar') ||
          addrZurLower.includes('28010') ||
          addrBaseLower.includes('zurbar') ||
          addrBaseLower.includes('28010');

        const centerLocation = isZurbaran ? 'ZURBARÁN' : 'CONCHA ESPINA';

        const centerAddress = isZurbaran 
          ? (center?.address_zurbaran || 'C. de Zurbarán, 10, bajo dcha, Chamberí, 28010 Madrid')
          : (center?.address_concha_espina || 'C/ Príncipe de Vergara 204 posterior (A la espalda del 204) - Bordeando el Restaurante \"La Ancha\"');

        const centerMetroInfo = isZurbaran
          ? '(Metro Iglesia, salida C. de Zurbarán)'
          : '(Metro Concha Espina, salida Plaza de Cataluña)';

        const mapsLink = isZurbaran
          ? 'https://maps.app.goo.gl/your-zurbaran-link'
          : 'https://goo.gl/maps/zHuPpdHATcJf6QWX8';

        const subject = 'Confirmación de reserva PAGADA - THE NOOK';
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color:#111827;">
            <h2>¡Reserva confirmada y pagada!</h2>
            <p>Hola <strong>${client.first_name || ''} ${client.last_name || ''}</strong>,</p>
            <p>Tu reserva en <strong>THE NOOK</strong> ha quedado confirmada y pagada. Detalles:</p>
            <ul>
              <li><strong>Tratamiento:</strong> ${bookingRow.services?.name || 'Tratamiento'}</li>
              <li><strong>Fecha y hora:</strong> ${bookingRow.booking_datetime ? new Date(bookingRow.booking_datetime).toLocaleString('es-ES') : ''}</li>
              <li><strong>Centro:</strong> THE NOOK ${centerLocation}</li>
            </ul>
            <p>
              Dirección:<br>
              ${centerAddress}<br>
              ${centerMetroInfo}
            </p>
            <p>Mapa: <a href="${mapsLink}" target="_blank" rel="noopener noreferrer">${mapsLink}</a></p>
          </div>
        `;

        const sendTo: string[] = [client.email];
        if (internalNotificationEmail && internalNotificationEmail.toLowerCase() !== client.email.toLowerCase()) {
          sendTo.push(internalNotificationEmail);
        }

        await resend.emails.send({ from: fromEmail, to: sendTo, subject, html });
        logStep('Immediate confirmation emails sent', { sendTo });

        return new Response(
          JSON.stringify({ ok: true, emailed: sendTo }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (_) {
      // ignore JSON parse errors and fall through to queue processing
    }

    // Get pending booking confirmations with payment (queued mode)
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

        // Persist Stripe customer id on booking for later off-session charge
        try {
          await supabaseClient
            .from('bookings')
            .update({ stripe_customer_id: stripeCustomer.id })
            .eq('id', booking.id);
        } catch (_) {}

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

        // Create secure payment URL (fallback when Origin header is missing e.g. cron)
        const originHeader = req.headers.get("origin");
        const publicSite = Deno.env.get("PUBLIC_SITE_URL") || "https://www.thenookmadrid.com";
        const baseUrl = originHeader && /^https?:\/\//.test(originHeader) ? originHeader : publicSite;
        const paymentUrl = `${baseUrl}/asegurar-reserva?setup_intent=${setupIntent.id}&client_secret=${setupIntent.client_secret}`;
        
        logStep(`Setup intent prepared`, { bookingId: booking.id, paymentUrl });

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
              email_status: 'awaiting_payment_confirmation'
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
