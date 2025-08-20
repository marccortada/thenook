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

    console.log('📧 Processing booking confirmation emails...');

    // Get pending email notifications
    const { data: notifications, error: fetchError } = await supabaseClient
      .from('automated_notifications')
      .select(`
        id,
        client_id,
        booking_id,
        subject,
        message,
        type,
        profiles!client_id(email, first_name, last_name),
        bookings(booking_datetime, total_price_cents, services(name))
      `)
      .eq('status', 'pending')
      .in('type', ['appointment_confirmation', 'booking_reminder'])
      .limit(10);

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

    console.log(`📬 Found ${notifications.length} notifications to send`);

    let successCount = 0;

    for (const notification of notifications) {
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

        // Send email using Resend
        const emailResponse = await resend.emails.send({
          from: 'The Nook Madrid <reservas@thenookmadrid.com>',
          to: [client.email],
          subject: notification.subject || (notification.type === 'booking_reminder' ? 'Recordatorio de tu cita' : 'Confirmación de tu reserva'),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin-bottom: 10px;">The Nook Madrid</h1>
                <h2 style="color: #e67e22; font-weight: normal;">${notification.type === 'booking_reminder' ? 'Recordatorio de Reserva' : 'Confirmación de Reserva'}</h2>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;">
                  Hola <strong>${client.first_name || ''} ${client.last_name || ''}</strong>,
                </p>
                <p style="margin: 0 0 15px 0;">
                  ${notification.type === 'booking_reminder' 
                    ? 'Te recordamos que tienes una cita próximamente. Aquí tienes los detalles:'
                    : 'Tu reserva ha sido confirmada exitosamente. Aquí tienes los detalles:'
                  }
                </p>
                
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>📅 Fecha y hora:</strong> ${
                    booking?.booking_datetime 
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
                  <p style="margin: 0 0 10px 0;"><strong>🎯 Servicio:</strong> ${booking?.services?.name || 'Servicio'}</p>
                  <p style="margin: 0;"><strong>💰 Precio:</strong> ${
                    booking?.total_price_cents 
                      ? `${(booking.total_price_cents / 100).toFixed(2)}€`
                      : 'A confirmar'
                  }</p>
                </div>
              </div>
              
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #2d5a2d;">
                  <strong>📍 Ubicación:</strong> The Nook Madrid<br>
                  <strong>📞 Teléfono:</strong> +34 XXX XXX XXX<br>
                  <strong>📧 Email:</strong> info@thenookmadrid.com
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                  ¡Te esperamos en The Nook Madrid!<br>
                  Si necesitas modificar o cancelar tu reserva, contacta con nosotros.
                </p>
              </div>
            </div>
          `,
        });

        console.log(`✅ Email sent to ${client.email}:`, emailResponse);

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

    console.log(`🎉 Email processing complete: ${successCount}/${notifications.length} successful`);

    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed', 
        processed: notifications.length,
        successful: successCount
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