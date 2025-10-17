import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
