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
          employees(profiles!profile_id(first_name, last_name))
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

        // Send email with payment link
        const emailResponse = await resend.emails.send({
          from: 'The Nook Madrid <reservas@thenookmadrid.com>',
          to: [client.email],
          subject: 'Asegurar tu reserva - The Nook Madrid',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="text-align: center; margin-bottom: 30px; background-color: white; padding: 20px; border-radius: 8px;">
                <h1 style="color: #2c3e50; margin-bottom: 10px;">The Nook Madrid</h1>
                <h2 style="color: #e67e22; font-weight: normal; margin: 0;">Asegurar tu Reserva</h2>
              </div>
              
              <div style="background-color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                  Hola <strong>${client.first_name || ''} ${client.last_name || ''}</strong>,
                </p>
                <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
                  Tu reserva ha sido confirmada exitosamente. Para asegurarla, necesitamos que introduzcas los datos de tu tarjeta. 
                  <strong style="color: #e67e22;">No se realizará ningún cargo hasta el momento del tratamiento.</strong>
                </p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e67e22;">
                  <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">📅 Detalles de tu Reserva</h3>
                  <div style="margin-bottom: 10px;">
                    <strong>🎯 Tratamiento:</strong> ${booking.services?.name || 'Servicio personalizado'}
                  </div>
                  <div style="margin-bottom: 10px;">
                    <strong>📅 Fecha y hora:</strong> ${
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
                    }
                  </div>
                  <div style="margin-bottom: 10px;">
                    <strong>⏱️ Duración:</strong> ${booking.duration_minutes || 60} minutos
                  </div>
                  <div style="margin-bottom: 10px;">
                    <strong>👩‍⚕️ Profesional:</strong> ${employeeName}
                  </div>
                  <div style="margin-bottom: 0;">
                    <strong>💰 Precio:</strong> ${
                      booking.total_price_cents 
                        ? `${(booking.total_price_cents / 100).toFixed(2)}€`
                        : 'A confirmar'
                    }
                  </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${paymentUrl}" 
                     style="background-color: #e67e22; color: white; padding: 15px 30px; text-decoration: none; 
                            border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    🔒 Asegurar mi Reserva
                  </a>
                </div>
                
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #2d5a2d;">
                    <strong>🛡️ Seguridad garantizada:</strong><br>
                    • Tu tarjeta se guarda de forma segura con Stripe<br>
                    • No se realizará ningún cargo hasta el momento del tratamiento<br>
                    • Puedes cancelar hasta 24h antes sin coste
                  </p>
                </div>
              </div>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📍 Ubicación</h3>
                <p style="margin: 0; color: #555;">
                  <strong>The Nook Madrid</strong><br>
                  📞 Teléfono: +34 XXX XXX XXX<br>
                  📧 Email: info@thenookmadrid.com
                </p>
              </div>
              
              <div style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">
                  Si tienes alguna pregunta o necesitas modificar tu reserva, no dudes en contactarnos.
                </p>
                <p style="margin: 0;">
                  ¡Te esperamos en The Nook Madrid! ✨
                </p>
              </div>
            </div>
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