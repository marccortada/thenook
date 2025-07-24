import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Crear cliente de Supabase con service role key
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, capabilities } = await req.json();

    if (!message) {
      throw new Error('No message provided');
    }

    // Detectar si el mensaje contiene intención de crear reserva
    const isBookingRequest = message.toLowerCase().includes('reservar') || 
                            message.toLowerCase().includes('reserva') ||
                            message.toLowerCase().includes('cita') ||
                            message.toLowerCase().includes('agendar');

    // Sistema de prompt con funciones para crear reservas
    const systemPrompt = `Eres un asistente virtual especializado para THE NOOK MADRID, centros de masajes y wellness en Madrid.

CAPACIDADES ESPECIALES DEL SISTEMA:
${capabilities && capabilities.includes('gestionar_reservas') ? `
- GESTIÓN DE RESERVAS: Puedes ayudar a buscar, modificar y cancelar reservas existentes
- CREAR NUEVAS RESERVAS: Puedes registrar nuevas reservas cuando un cliente solicite
- BÚSQUEDA POR EMAIL: Cuando un cliente proporcione su email, puedes encontrar sus reservas y bonos
- CONSULTA DE BONOS: Puedes mostrar bonos activos, sesiones restantes y fechas de caducidad
` : ''}

INFORMACIÓN GENERAL:
- THE NOOK tiene 2 centros en Madrid: Zurbarán (Chamberí) y Concha Espina (Chamartín)
- Somos especialistas en masajes y terapia manual
- Calificación: 4.9/5 basado en 989 reseñas de Google
- Utilizamos la plataforma de pago seguro Stripe Inc.
- Trabajamos sin cobro por adelantado

PROCESO PARA CREAR NUEVAS RESERVAS:
Cuando un cliente quiere hacer una reserva nueva:
1. SOLICITA INFORMACIÓN BÁSICA:
   - Nombre completo
   - Email
   - Teléfono
   - Tipo de servicio deseado
   - Fecha y hora preferida
   - Centro preferido (Zurbarán o Concha Espina)

2. CONFIRMA DETALLES:
   - Revisa toda la información
   - Explica el precio del servicio
   - Confirma disponibilidad

3. CREA LA RESERVA:
   - Registra en el sistema con status "confirmed"
   - Genera confirmación para el cliente
   - Proporciona detalles de la cita

SERVICIOS DISPONIBLES EN EL SISTEMA:

MASAJES (60 minutos - 60€):
1. Masaje Descontracturante - Para aliviar tensiones musculares y contracturas
2. Masaje Relajante - Para relajación profunda y bienestar general
3. Masaje Deportivo - Especializado para deportistas y actividad física
4. Masaje para Dos (en pareja) - Experiencia compartida en cabinas dobles (120€)
5. Masaje Futura Mamá - Especializado para embarazadas (OBLIGATORIO avisar al reservar)
6. Masaje a Cuatro Manos - Experiencia única con dos terapeutas (120€)
7. Masaje con Piedras Calientes - Terapia con termoterapia
8. Masaje Piernas Cansadas - Específico para mejorar circulación
9. Drenaje Linfático - Para desintoxicación y reducción de retención
10. Reflexología Podal - Terapia a través de puntos reflejos en los pies

RITUALES (90 minutos - 85€):
- Ritual Energizante - Tratamiento completo revitalizante
- Otros rituales especializados según necesidades

CENTROS DISPONIBLES:
1. ZURBARÁN (Chamberí) - Centro principal
2. CONCHA ESPINA (Chamartín) - Segundo centro

IMPORTANTE PARA CREAR RESERVAS:
- Siempre confirma todos los datos antes de crear la reserva
- Explica que recibirá confirmación por email
- Menciona la política de cancelación (24h de antelación)
- Para embarazadas, OBLIGATORIO informar al hacer la reserva
- Utiliza el formato: "✅ RESERVA CREADA" cuando confirmes una nueva reserva

INSTRUCCIONES PARA RESPUESTAS:
- Sé profesional y empático
- Solicita información paso a paso
- Confirma detalles importantes
- Explica claramente las opciones disponibles
- Si no puedes realizar una acción, explica cómo contactar con el centro`;

    // Analizar si necesitamos crear una reserva
    if (isBookingRequest) {
      // Extraer información de la reserva del mensaje usando IA
      const extractionPrompt = `
Analiza el siguiente mensaje y extrae información de reserva si está disponible.
Mensaje: "${message}"

Devuelve SOLO un JSON válido con la siguiente estructura (deja null si no está disponible):
{
  "hasBookingInfo": boolean,
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "service": string | null,
  "date": string | null,
  "time": string | null,
  "center": string | null,
  "notes": string | null
}`;

      const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: extractionPrompt }],
          max_tokens: 200,
          temperature: 0.1,
        }),
      });

      if (extractionResponse.ok) {
        const extractionData = await extractionResponse.json();
        let bookingInfo;
        
        try {
          bookingInfo = JSON.parse(extractionData.choices[0].message.content);
        } catch (e) {
          bookingInfo = { hasBookingInfo: false };
        }

        // Si tenemos información completa, crear la reserva
        if (bookingInfo.hasBookingInfo && bookingInfo.name && bookingInfo.email && 
            bookingInfo.service && bookingInfo.date && bookingInfo.time) {
          
          try {
            // Buscar o crear cliente
            let { data: clientProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', bookingInfo.email)
              .single();

            if (!clientProfile) {
              // Crear nuevo cliente
              const { data: newClient } = await supabase
                .from('profiles')
                .insert({
                  email: bookingInfo.email,
                  first_name: bookingInfo.name.split(' ')[0],
                  last_name: bookingInfo.name.split(' ').slice(1).join(' ') || '',
                  phone: bookingInfo.phone,
                  role: 'client'
                })
                .select('id')
                .single();
              
              clientProfile = newClient;
            }

            // Buscar servicio
            const { data: service } = await supabase
              .from('services')
              .select('id, price_cents, duration_minutes')
              .ilike('name', `%${bookingInfo.service}%`)
              .single();

            if (service && clientProfile) {
              // Crear la reserva
              const bookingDateTime = new Date(`${bookingInfo.date}T${bookingInfo.time}`);
              
              const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                  client_id: clientProfile.id,
                  service_id: service.id,
                  booking_datetime: bookingDateTime.toISOString(),
                  duration_minutes: service.duration_minutes,
                  total_price_cents: service.price_cents,
                  status: 'confirmed',
                  payment_status: 'pending',
                  channel: 'chatbot',
                  notes: `Reserva creada por chatbot. Centro preferido: ${bookingInfo.center || 'No especificado'}. ${bookingInfo.notes || ''}`
                });

              if (!bookingError) {
                // Reserva creada exitosamente
                const successMessage = `✅ RESERVA CREADA EXITOSAMENTE

📋 Detalles de tu reserva:
👤 Cliente: ${bookingInfo.name}
📧 Email: ${bookingInfo.email}
🎯 Servicio: ${bookingInfo.service}
📅 Fecha: ${bookingInfo.date}
⏰ Hora: ${bookingInfo.time}
🏢 Centro: ${bookingInfo.center || 'Por confirmar'}
💰 Precio: ${(service.price_cents / 100).toFixed(2)}€

✨ Tu reserva ha sido registrada en nuestro sistema. Recibirás un email de confirmación en breve.

⚠️ Política de cancelación: 24h de antelación sin penalización.

¿Necesitas ayuda con algo más?`;

                return new Response(JSON.stringify({ reply: successMessage }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          } catch (error) {
            console.error('Error creating booking:', error);
          }
        }
      }
    }

    // Respuesta normal del chatbot
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(context || []),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chatbot function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});