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
  console.log(`[CONFIRM-PAYMENT-METHOD] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { setup_intent_id } = await req.json();

    if (!setup_intent_id) {
      throw new Error('setup_intent_id is required');
    }

    // Initialize services
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || "", { 
      apiVersion: "2023-10-16" 
    });

    logStep('Retrieving setup intent', { setup_intent_id });

    // Get setup intent from Stripe
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
    
    if (!setupIntent) {
      throw new Error('Setup Intent not found');
    }

    logStep('Setup intent retrieved', { 
      status: setupIntent.status, 
      payment_method: setupIntent.payment_method 
    });

    // Find booking by setup intent
    const { data: paymentIntent, error: findError } = await supabaseClient
      .from('booking_payment_intents')
      .select('booking_id')
      .eq('stripe_setup_intent_id', setup_intent_id)
      .single();

let bookingId: string | null = null;
if (!findError && paymentIntent) {
  bookingId = paymentIntent.booking_id;
  logStep('Found booking via DB record', { bookingId });
} else {
  // Fallback: try to read booking_id from SetupIntent metadata (Checkout in setup mode)
  const metaBookingId = (setupIntent.metadata && (setupIntent.metadata as any).booking_id) as string | undefined;
  if (!metaBookingId) {
    throw new Error('Booking not found for this setup intent');
  }
  bookingId = metaBookingId;
  logStep('Found booking via metadata', { bookingId });
  // Ensure payment intent row exists for future lookups
  await supabaseClient.from('booking_payment_intents').upsert({
    booking_id: bookingId,
    stripe_setup_intent_id: setup_intent_id,
    client_secret: '',
    status: setupIntent.status || 'requires_payment_method',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_setup_intent_id' });
}

    // Update booking and payment intent with confirmed payment method
    const updates = {
      stripe_payment_method_id: setupIntent.payment_method as string,
      payment_method_status: setupIntent.status,
      updated_at: new Date().toISOString()
    };

    await Promise.all([
      // Update booking
      supabaseClient
        .from('bookings')
        .update(updates)
        .eq('id', bookingId),
      
      // Update payment intent record
      supabaseClient
        .from('booking_payment_intents')
        .update({
          stripe_payment_method_id: setupIntent.payment_method as string,
          status: setupIntent.status,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_setup_intent_id', setup_intent_id)
    ]);

    logStep('Booking and payment intent updated successfully', {
      bookingId,
      paymentMethodId: setupIntent.payment_method,
      status: setupIntent.status
    });

    // Send confirmation email if payment method is confirmed
    if (setupIntent.status === 'succeeded') {
      logStep('Sending payment confirmation email');
      
      // Get booking details for email
      const { data: bookingData } = await supabaseClient
        .from('bookings')
        .select(`
          id,
          booking_datetime,
          total_price_cents,
          duration_minutes,
          profiles!client_id(email, first_name, last_name),
          services(name),
          employees(profiles!profile_id(first_name, last_name))
        `)
        .eq('id', bookingId)
        .single();

      if (bookingData?.profiles?.email) {
        const client = bookingData.profiles;
        const employeeName = bookingData.employees?.profiles ? 
          `${bookingData.employees.profiles.first_name || ''} ${bookingData.employees.profiles.last_name || ''}`.trim() :
          'Nuestro equipo';

        try {
          await resend.emails.send({
            from: (Deno.env.get('RESEND_FROM_EMAIL') as string) || 'The Nook Madrid <reservas@gnerai.com>',
            to: [client.email],
            subject: '✅ Tarjeta confirmada - Reserva asegurada - The Nook Madrid',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="text-align: center; margin-bottom: 30px; background-color: white; padding: 20px; border-radius: 8px;">
                  <h1 style="color: #2c3e50; margin-bottom: 10px;">The Nook Madrid</h1>
                  <h2 style="color: #27ae60; font-weight: normal; margin: 0;">✅ ¡Reserva Asegurada!</h2>
                </div>
                
                <div style="background-color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                    Hola <strong>${client.first_name || ''} ${client.last_name || ''}</strong>,
                  </p>
                  <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
                    ¡Perfecto! Hemos confirmado tu método de pago y tu reserva está completamente asegurada. 
                    <strong style="color: #27ae60;">El cargo se realizará automáticamente el día de tu tratamiento.</strong>
                  </p>
                  
                  <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
                    <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">📅 Resumen de tu Tratamiento</h3>
                    <div style="margin-bottom: 10px;">
                      <strong>🎯 Tratamiento:</strong> ${bookingData.services?.name || 'Servicio personalizado'}
                    </div>
                    <div style="margin-bottom: 10px;">
                      <strong>📅 Fecha y hora:</strong> ${
                        bookingData.booking_datetime 
                          ? new Date(bookingData.booking_datetime).toLocaleDateString('es-ES', {
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
                      <strong>⏱️ Duración:</strong> ${bookingData.duration_minutes || 60} minutos
                    </div>
                    <div style="margin-bottom: 10px;">
                      <strong>👩‍⚕️ Profesional:</strong> ${employeeName}
                    </div>
                    <div style="margin-bottom: 0;">
                      <strong>💰 Precio:</strong> ${
                        bookingData.total_price_cents 
                          ? `${(bookingData.total_price_cents / 100).toFixed(2)}€`
                          : 'A confirmar'
                      }
                    </div>
                  </div>
                  
                  <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                      <strong>💳 Información de Pago:</strong><br>
                      • Tu método de pago está confirmado y seguro<br>
                      • El cargo se realizará automáticamente el día de tu cita<br>
                      • Puedes cancelar hasta 24h antes sin coste alguno
                    </p>
                  </div>
                  
                  <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                    <p style="margin: 0; font-size: 14px; color: #0c5460;">
                      <strong>📋 Recordatorios:</strong><br>
                      • Llega 10 minutos antes de tu cita<br>
                      • Te enviaremos un recordatorio 24h antes<br>
                      • Si necesitas cambios, contáctanos lo antes posible
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
                    ¡Nos vemos pronto en The Nook Madrid! ✨
                  </p>
                </div>
              </div>
            `,
          });

          logStep('Payment confirmation email sent successfully');
        } catch (emailError) {
          logStep('ERROR sending confirmation email', { error: emailError.message });
          // Don't fail the whole operation if email fails
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        booking_id: bookingId,
        payment_method_id: setupIntent.payment_method,
        status: setupIntent.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('ERROR in confirm-payment-method', { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
