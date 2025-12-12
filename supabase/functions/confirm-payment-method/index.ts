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
  // Log immediately when function is called
  console.log('[CONFIRM-PAYMENT-METHOD] Function invoked');
  console.log('[CONFIRM-PAYMENT-METHOD] Method:', req.method);
  console.log('[CONFIRM-PAYMENT-METHOD] URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('[CONFIRM-PAYMENT-METHOD] OPTIONS request, returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    console.log('[CONFIRM-PAYMENT-METHOD] Processing request...');

    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      logStep('ERROR parsing request body', { error: parseError });
      throw new Error('Invalid request body. Expected JSON.');
    }

    const { setup_intent_id, session_id } = requestBody;

    // Initialize Stripe first to get setup intent
    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || "", { 
      apiVersion: "2023-10-16" 
    });

    let setupIntentId: string;

    // If session_id is provided, get setup_intent from the session
    if (session_id) {
      logStep('Retrieving checkout session', { session_id });
      try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        if (!session.setup_intent) {
          throw new Error('No setup_intent found in checkout session');
        }
        setupIntentId = typeof session.setup_intent === 'string' 
          ? session.setup_intent 
          : session.setup_intent.id;
        logStep('Setup intent ID retrieved from session', { setupIntentId });
      } catch (sessionError: any) {
        logStep('ERROR retrieving checkout session', { error: sessionError.message });
        throw new Error(`No se pudo obtener la sesión de Stripe: ${sessionError.message || 'Error desconocido'}`);
      }
    } else if (setup_intent_id && typeof setup_intent_id === 'string') {
      setupIntentId = setup_intent_id;
    } else {
      logStep('ERROR missing setup_intent_id or session_id', { received: { setup_intent_id, session_id } });
      throw new Error('Either setup_intent_id or session_id is required');
    }

    // Initialize services
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const internalNotificationEmail = (Deno.env.get('THENOOK_NOTIFICATION_EMAIL') ?? 'reservas@thenookmadrid.com').trim();

    logStep('Retrieving setup intent', { setupIntentId });

    // Get setup intent from Stripe
    let setupIntent: Stripe.SetupIntent;
    try {
      setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    } catch (stripeError: any) {
      logStep('ERROR retrieving setup intent from Stripe', { 
        error: stripeError.message, 
        code: stripeError.code,
        type: stripeError.type
      });
      throw new Error(`No se pudo recuperar el setup intent de Stripe: ${stripeError.message || 'Error desconocido'}`);
    }
    
    if (!setupIntent) {
      throw new Error('Setup Intent not found in Stripe');
    }

    logStep('Setup intent retrieved', { 
      status: setupIntent.status, 
      payment_method: setupIntent.payment_method,
      last_setup_error: setupIntent.last_setup_error,
      next_action: setupIntent.next_action
    });

    // Find booking by setup intent
    const { data: paymentIntent, error: findError } = await supabaseClient
      .from('booking_payment_intents')
      .select('booking_id')
      .eq('stripe_setup_intent_id', setupIntentId)
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
    stripe_setup_intent_id: setupIntentId,
    client_secret: '',
    status: setupIntent.status || 'requires_payment_method',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'booking_id,stripe_setup_intent_id' });
}

    const paymentMethodId = setupIntent.payment_method as string | null;
    const customerId =
      typeof setupIntent.customer === "string"
        ? (setupIntent.customer as string)
        : null;

    // CRITICAL: Verificar el status del setup intent
    // Con 3D Secure, el status puede ser 'requires_action' si necesita confirmación adicional
    // o 'succeeded' si ya está confirmado
    logStep('Setup intent status check', { 
      status: setupIntent.status,
      payment_method: paymentMethodId,
      requires_action: setupIntent.status === 'requires_action',
      succeeded: setupIntent.status === 'succeeded'
    });

    // Si el status es 'requires_action', significa que necesita confirmación adicional (3D Secure)
    if (setupIntent.status === 'requires_action') {
      logStep('Setup intent requires action', { 
        next_action: setupIntent.next_action,
        client_secret: setupIntent.client_secret 
      });
      // En Checkout, esto debería manejarse automáticamente, pero verificamos
      throw new Error('El setup intent requiere acción adicional. Por favor, completa la autenticación 3D Secure.');
    }

    // Si el status no es 'succeeded' y no es 'requires_action', hay un error
    if (setupIntent.status !== 'succeeded') {
      const errorMsg = setupIntent.last_setup_error?.message || `El setup intent tiene status: ${setupIntent.status}`;
      logStep('Setup intent not succeeded', { 
        status: setupIntent.status,
        error: setupIntent.last_setup_error 
      });
      throw new Error(`La tarjeta no se pudo guardar: ${errorMsg}`);
    }

    // CRITICAL: Si el setupIntent tiene un payment_method y status 'succeeded', la tarjeta está guardada
    if (!paymentMethodId) {
      logStep('ERROR: No payment method found', { setupIntent });
      throw new Error('No se encontró un método de pago en el setup intent. La tarjeta no se pudo guardar.');
    }

    // CRITICAL: Si hay payment_method_id, significa que Stripe confirmó que la tarjeta se guardó
    // Siempre usar 'succeeded' para payment_method_status cuando hay payment_method_id
    // Esto asegura que el icono se muestre en azul en el calendario
    const paymentMethodStatus = 'succeeded';
    
    const updates = {
      stripe_payment_method_id: paymentMethodId,
      stripe_customer_id: customerId,
      payment_method_status: paymentMethodStatus,
      updated_at: new Date().toISOString()
    };

    // Get client_id from booking to update all their bookings
    const { data: bookingData } = await supabaseClient
      .from('bookings')
      .select('client_id')
      .eq('id', bookingId)
      .single();

    // Update the specific booking
    logStep('Updating booking', { bookingId, updates });
    const { data: updatedBooking, error: bookingUpdateError } = await supabaseClient
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select('id, stripe_payment_method_id, payment_method_status')
      .single();
    
    if (bookingUpdateError) {
      logStep('ERROR updating booking', { 
        error: bookingUpdateError.message,
        code: bookingUpdateError.code,
        details: bookingUpdateError.details,
        hint: bookingUpdateError.hint
      });
      throw new Error(`Error al actualizar la reserva: ${bookingUpdateError.message}`);
    }
    
    logStep('Booking updated successfully', { 
      booking_id: updatedBooking?.id,
      stripe_payment_method_id: updatedBooking?.stripe_payment_method_id,
      payment_method_status: updatedBooking?.payment_method_status
    });
    
    // Update payment intent record
    logStep('Updating payment intent record', { setupIntentId });
    const { data: updatedPaymentIntent, error: paymentIntentUpdateError } = await supabaseClient
      .from('booking_payment_intents')
      .update({
        stripe_payment_method_id: paymentMethodId,
        stripe_customer_id: customerId,
        status: paymentMethodStatus,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_setup_intent_id', setupIntentId)
      .select('id, stripe_payment_method_id, status')
      .single();
    
    if (paymentIntentUpdateError) {
      logStep('ERROR updating payment intent', { 
        error: paymentIntentUpdateError.message,
        code: paymentIntentUpdateError.code
      });
      // No lanzar error aquí, solo loguear, ya que la reserva ya se actualizó
    } else {
      logStep('Payment intent updated successfully', { 
        payment_intent_id: updatedPaymentIntent?.id,
        stripe_payment_method_id: updatedPaymentIntent?.stripe_payment_method_id,
        status: updatedPaymentIntent?.status
      });
    }

    // CRITICAL: Update ALL bookings for this client that don't have a payment method or have an empty one
    // This ensures the card icon shows correctly for all their bookings
    if (bookingData?.client_id && paymentMethodId) {
      logStep('Updating all bookings for client without payment method', {
        client_id: bookingData.client_id,
        payment_method_id: paymentMethodId
      });
      
      // Update bookings that have null or empty payment_method_id
      // Using .or() to match both null and empty string cases
      const { data: updatedBookings, error: updateAllError } = await supabaseClient
        .from('bookings')
        .update({
          stripe_payment_method_id: paymentMethodId,
          stripe_customer_id: customerId,
          payment_method_status: paymentMethodStatus,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', bookingData.client_id)
        .or('stripe_payment_method_id.is.null,stripe_payment_method_id.eq.')
        .select('id');
      
      if (updateAllError) {
        logStep('ERROR updating all client bookings', { error: updateAllError.message });
      } else {
        logStep('Successfully updated all client bookings', { 
          updated_count: updatedBookings?.length || 0,
          booking_ids: updatedBookings?.map((b: any) => b.id) || []
        });
      }
    }

    logStep('All updates completed', {
      bookingId,
      paymentMethodId: setupIntent.payment_method,
      status: setupIntent.status,
      paymentMethodStatus: paymentMethodStatus,
      booking_updated: !!updatedBooking,
      payment_intent_updated: !!updatedPaymentIntent
    });

    // Send confirmation email if payment method is confirmed (si hay payment_method_id, está confirmado)
    if (paymentMethodId) {
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
        payment_method_id: paymentMethodId,
        customer_id: customerId,
        status: paymentMethodStatus, // Usar paymentMethodStatus ('succeeded') en lugar de setupIntent.status
        setup_intent_status: setupIntent.status // Mantener el status original del setupIntent para referencia
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Error desconocido';
    logStep('ERROR in confirm-payment-method', { error: errorMessage, stack: error?.stack });
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
