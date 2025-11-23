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
    const internalNotificationEmail = (Deno.env.get('THENOOK_NOTIFICATION_EMAIL') ?? 'reservas@thenookmadrid.com').trim();
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
      logStep('Payment method confirmed, sending booking confirmation email');
      
      try {
        // Ensure notification exists in automated_notifications
        const { data: bookingData } = await supabaseClient
          .from('bookings')
          .select(`
            id,
            client_id,
            booking_datetime,
            services(name),
            centers(name, address_zurbaran, address_concha_espina)
          `)
          .eq('id', bookingId)
          .single();

        if (bookingData?.client_id) {
          // Check if notification already exists
          const { data: existingNotification } = await supabaseClient
            .from('automated_notifications')
            .select('id')
            .eq('booking_id', bookingId)
            .eq('type', 'appointment_confirmation')
            .maybeSingle();

          // Create notification if it doesn't exist
          if (!existingNotification) {
            const selectedService = bookingData.services?.name || 'nuestro tratamiento';
            const formattedDate = bookingData.booking_datetime
              ? new Date(bookingData.booking_datetime).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Por confirmar';

            await supabaseClient
              .from('automated_notifications')
              .insert({
                type: 'appointment_confirmation',
                client_id: bookingData.client_id,
                booking_id: bookingId,
                scheduled_for: new Date().toISOString(),
                subject: 'Reserva asegurada en THE NOOK',
                message: `Tu cita para ${selectedService} el ${formattedDate} ha quedado registrada. Recuerda revisar nuestra política de cancelación en https://www.thenookmadrid.com/politica-de-cancelaciones/.`,
                metadata: {
                  channels: ['email'],
                  booking_id: bookingId,
                  source: 'payment_method_confirmed'
                },
                status: 'pending'
              });
            
            logStep('Notification created for booking confirmation');
          }

          // Wait a moment for the notification to be created
          await new Promise(resolve => setTimeout(resolve, 500));

          // Invoke send-booking-confirmation edge function
          const { error: invokeError } = await supabaseClient.functions.invoke('send-booking-confirmation', {
            body: { source: 'payment_confirmed', booking_id: bookingId }
          });

          if (invokeError) {
            logStep('ERROR invoking send-booking-confirmation', { error: invokeError.message });
          } else {
            logStep('Booking confirmation email function invoked successfully');
          }
        }
      } catch (emailError) {
        logStep('ERROR sending confirmation email', { error: emailError.message });
        // Don't fail the whole operation if email fails
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
