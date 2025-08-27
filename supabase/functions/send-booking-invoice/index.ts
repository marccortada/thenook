import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('📧 Processing booking invoice generation...');

  try {
    const { booking_id } = await req.json();

    if (!booking_id) {
      throw new Error('booking_id is required');
    }

    // Get booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles!client_id (
          first_name,
          last_name,
          email,
          phone
        ),
        services (
          name,
          description,
          duration_minutes,
          price_cents
        ),
        centers (
          name,
          address,
          phone,
          email
        ),
        employees (
          profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      throw new Error('Booking not found');
    }

    console.log('📋 Found booking:', booking.id);

    const client = booking.profiles;
    const service = booking.services;
    const center = booking.centers;
    const employee = booking.employees?.profiles;

    if (!client?.email) {
      console.log('❌ No email found for client');
      return new Response(JSON.stringify({ success: true, message: 'No email to send' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get logo from storage
    let logoUrl = '';
    try {
      const { data: logoData } = await supabase.storage
        .from('gift-cards')
        .getPublicUrl('logo.png');
      
      if (logoData?.publicUrl) {
        logoUrl = logoData.publicUrl;
      }
    } catch (error) {
      console.log('Logo not found, proceeding without logo');
    }

    // Format date and time
    const bookingDate = new Date(booking.booking_datetime);
    const formattedDate = bookingDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = bookingDate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Calculate price
    const price = (booking.total_price_cents || 0) / 100;

    // Generate invoice HTML
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Factura de Reserva - The Nook Madrid</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #8B5CF6;
              padding-bottom: 20px;
            }
            .logo {
              max-width: 150px;
              height: auto;
              margin-bottom: 10px;
            }
            .title {
              color: #8B5CF6;
              font-size: 28px;
              font-weight: bold;
              margin: 0;
            }
            .subtitle {
              color: #666;
              font-size: 16px;
              margin: 5px 0 0 0;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #333;
              margin-bottom: 20px;
            }
            .info-section {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #8B5CF6;
            }
            .info-title {
              font-weight: 600;
              color: #8B5CF6;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .info-item {
              margin: 8px 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .info-label {
              font-weight: 500;
              color: #555;
            }
            .info-value {
              color: #333;
              font-weight: 600;
            }
            .price {
              font-size: 20px;
              color: #8B5CF6;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .contact-info {
              margin: 15px 0;
            }
            .note {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
              font-size: 14px;
            }
            @media (max-width: 600px) {
              body {
                padding: 10px;
              }
              .container {
                padding: 20px;
              }
              .title {
                font-size: 24px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="The Nook Madrid" class="logo">` : ''}
              <h1 class="title">THE NOOK</h1>
              <p class="subtitle">Factura de Reserva</p>
            </div>

            <div class="greeting">
              ¡Hola ${client.first_name || ''} ${client.last_name || ''}!
            </div>

            <p>Has reservado correctamente tu tratamiento en <strong>THE NOOK</strong></p>
            <p>Estos son los detalles de la reserva:</p>

            <div class="info-section">
              <div class="info-title">📋 Detalles del Servicio</div>
              <div class="info-item">
                <span class="info-label">Servicio:</span>
                <span class="info-value">${service?.name || 'Servicio personalizado'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Duración:</span>
                <span class="info-value">${service?.duration_minutes || booking.duration_minutes} minutos</span>
              </div>
              <div class="info-item">
                <span class="info-label">Fecha:</span>
                <span class="info-value">${formattedDate}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Hora:</span>
                <span class="info-value">${formattedTime}</span>
              </div>
              ${employee ? `
              <div class="info-item">
                <span class="info-label">Especialista:</span>
                <span class="info-value">${employee.first_name} ${employee.last_name}</span>
              </div>
              ` : ''}
            </div>

            <div class="info-section">
              <div class="info-title">📍 Centro</div>
              <div class="info-item">
                <span class="info-label">Ubicación:</span>
                <span class="info-value">${center?.name || 'The Nook Madrid'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Dirección:</span>
                <span class="info-value">${center?.address || 'C/ Zurbarán 10 (Metro: Alonso Martínez y Rubén Darío)'}</span>
              </div>
            </div>

            <div class="info-section">
              <div class="info-title">💰 Información de Pago</div>
              <div class="info-item">
                <span class="info-label">Precio:</span>
                <span class="info-value price">${price > 0 ? `${price.toFixed(2)}€` : 'A determinar en centro'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Estado:</span>
                <span class="info-value">${booking.payment_status === 'paid' ? 'Pagado' : 'Pendiente de pago'}</span>
              </div>
            </div>

            <div class="note">
              <strong>📝 Condiciones importantes:</strong><br>
              • Este email es una confirmación de tu reserva<br>
              • Es aconsejable llegar al centro cinco minutos antes de la cita<br>
              • Te rogamos máxima puntualidad, al haber otras citas después de la vuestra<br>
              • En caso de estar embarazada por favor háznoslo saber con antelación<br>
              • Si llegáis tarde, quizás no podamos realizar el tratamiento completo
            </div>

            <div class="footer">
              <div class="contact-info">
                <strong>THE NOOK Madrid</strong><br>
                📞 ${center?.phone || '911 481 474 / 622 360 922'}<br>
                📧 ${center?.email || 'reservas@thenookmadrid.com'}
              </div>
              <p>Te recomendamos leer la Política de Cancelación, la tienes aquí:<br>
                <a href="https://www.thenookmadrid.com/politica-de-cancelaciones/" style="color: #8B5CF6;">
                  https://www.thenookmadrid.com/politica-de-cancelaciones/
                </a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: 'The Nook Madrid <reservas@thenookmadrid.com>',
      to: [client.email],
      subject: `Factura de Reserva - ${service?.name || 'Tratamiento'} - The Nook Madrid`,
      html: invoiceHtml,
    });

    console.log('✅ Invoice email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Invoice sent successfully',
      emailId: emailResponse.data?.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error sending invoice:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to send invoice', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});