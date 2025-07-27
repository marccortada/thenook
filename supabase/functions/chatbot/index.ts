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
    const { message, context, capabilities, userInfo } = await req.json();

    if (!message) {
      throw new Error('No message provided');
    }

    console.log('User info received:', userInfo);

    // Detectar si es empleado o admin
    const isStaff = userInfo && (userInfo.isAdmin || userInfo.isEmployee);
    const isClient = !isStaff;

    // Detectar diferentes tipos de intenciones
    const isBookingRequest = message.toLowerCase().includes('reservar') || 
                            message.toLowerCase().includes('reserva') ||
                            message.toLowerCase().includes('cita') ||
                            message.toLowerCase().includes('agendar');

    const isCancelRequest = message.toLowerCase().includes('cancelar') ||
                           message.toLowerCase().includes('anular') ||
                           message.toLowerCase().includes('eliminar reserva');

    const isModifyRequest = message.toLowerCase().includes('modificar') ||
                           message.toLowerCase().includes('cambiar') ||
                           message.toLowerCase().includes('reprogramar') ||
                           message.toLowerCase().includes('mover');

    const isSearchRequest = message.toLowerCase().includes('ver mis reservas') ||
                           message.toLowerCase().includes('consultar') ||
                           message.toLowerCase().includes('buscar reservas') ||
                           (message.includes('@') && (message.toLowerCase().includes('reservas') || message.toLowerCase().includes('citas')));

    // Detectar consultas específicas del staff
    const isStaffScheduleRequest = isStaff && (
      message.toLowerCase().includes('citas de hoy') ||
      message.toLowerCase().includes('agenda de hoy') ||
      message.toLowerCase().includes('mis citas') ||
      message.toLowerCase().includes('horario') ||
      message.toLowerCase().includes('turnos')
    );

    const isStaffClientInfoRequest = isStaff && (
      message.toLowerCase().includes('información del cliente') ||
      message.toLowerCase().includes('historial del cliente') ||
      message.toLowerCase().includes('notas del cliente')
    );

    // Sistema de prompt diferenciado por rol
    let systemPrompt = `Eres un asistente virtual especializado para THE NOOK MADRID, centros de masajes y wellness en Madrid.

DETECCIÓN DE USUARIO:
${isStaff ? `
🔹 USUARIO ACTUAL: EMPLEADO/ADMINISTRADOR (${userInfo.name})
🔹 ACCESO: Información interna del centro y gestión de citas
🔹 CAPACIDADES ESPECIALES PARA STAFF:
  - Consultar agenda completa del día
  - Ver información detallada de clientes
  - Gestionar reservas de cualquier cliente
  - Acceso a estadísticas del centro
  - Información sobre empleados y turnos
` : `
🔹 USUARIO ACTUAL: CLIENTE
🔹 ACCESO: Solo información general del centro y sus propias reservas
🔹 RESTRICCIONES: NO mostrar información interna, ni agendas de empleados, ni datos de otros clientes
`}

CAPACIDADES ESPECIALES DEL SISTEMA:
${capabilities && capabilities.includes('gestionar_reservas') ? `
- GESTIÓN DE RESERVAS: Puedes ayudar a buscar, modificar y cancelar reservas
- CREAR NUEVAS RESERVAS: Puedes registrar nuevas reservas cuando se solicite
- BÚSQUEDA POR EMAIL: Puedes encontrar reservas y bonos por email
- CONSULTA DE BONOS: Puedes mostrar bonos activos, sesiones restantes y fechas
` : ''}

${isStaff ? `
FUNCIONES ESPECIALES PARA EMPLEADOS:
- AGENDA DEL DÍA: Puedes mostrar todas las citas del día actual
- INFORMACIÓN DE CLIENTES: Acceso a historial completo de clientes
- GESTIÓN AVANZADA: Modificar cualquier reserva del sistema
- ESTADÍSTICAS: Información sobre ocupación y rendimiento
- EMPLEADOS: Información sobre horarios y disponibilidad del staff

FORMATO PARA MOSTRAR AGENDA DEL DÍA:
📅 **AGENDA DEL DÍA - ${new Date().toLocaleDateString('es-ES')}**

🕐 [HORA] | 👤 [CLIENTE] | 🎯 [SERVICIO] | 👨‍⚕️ [EMPLEADO]
📧 Email: [email] | 📞 Teléfono: [teléfono]
💳 Estado: [estado_pago] | 📋 Notas: [notas]
---
` : ''}

INFORMACIÓN GENERAL:
- THE NOOK tiene 2 centros en Madrid: Zurbarán (Chamberí) y Concha Espina (Chamartín)
- Especialistas en masajes y terapia manual
- Calificación: 4.9/5 basado en 989 reseñas de Google
- Plataforma de pago seguro Stripe Inc.
- Sin cobro por adelantado

${isClient ? `
SERVICIOS DISPONIBLES PARA CLIENTES:

MASAJES (60 minutos - 60€):
1. Masaje Descontracturante - Para aliviar tensiones musculares
2. Masaje Relajante - Para relajación profunda y bienestar
3. Masaje Deportivo - Especializado para deportistas
4. Masaje para Dos (en pareja) - Experiencia compartida (120€)
5. Masaje Futura Mamá - Especializado para embarazadas
6. Masaje a Cuatro Manos - Con dos terapeutas (120€)
7. Masaje con Piedras Calientes - Terapia con termoterapia
8. Masaje Piernas Cansadas - Para mejorar circulación
9. Drenaje Linfático - Desintoxicación y reducción de retención
10. Reflexología Podal - Terapia a través de puntos reflejos

RITUALES (90 minutos - 85€):
- Ritual Energizante - Tratamiento completo revitalizante

CENTROS DISPONIBLES:
1. ZURBARÁN (Chamberí) - Centro principal
2. CONCHA ESPINA (Chamartín) - Segundo centro
` : ''}

INSTRUCCIONES IMPORTANTES:
- ${isClient ? 'NUNCA proporciones información interna, agendas de empleados o datos de otros clientes' : 'Proporciona información completa sobre operaciones internas cuando se solicite'}
- Sé profesional y empático
- ${isStaff ? 'Para empleados: ayuda con la organización diaria y gestión de citas' : 'Para clientes: enfócate en servicios y sus propias reservas'}
- Confirma detalles importantes antes de realizar acciones
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

    // Función específica para empleados: mostrar agenda del día
    if (isStaffScheduleRequest) {
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const { data: todayBookings } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_datetime,
            status,
            payment_status,
            notes,
            services (name),
            profiles!bookings_client_id_fkey (first_name, last_name, email, phone)
          `)
          .gte('booking_datetime', startOfDay.toISOString())
          .lt('booking_datetime', endOfDay.toISOString())
          .in('status', ['confirmed', 'pending'])
          .order('booking_datetime', { ascending: true });

        if (todayBookings && todayBookings.length > 0) {
          const agendaList = todayBookings.map((booking: any) => {
            const date = new Date(booking.booking_datetime);
            const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const clientName = `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim();
            const service = booking.services?.name || 'Servicio no especificado';
            const status = booking.status === 'confirmed' ? '✅' : '⏳';
            const paymentStatus = booking.payment_status === 'completed' ? '💳 Pagado' : '💰 Pendiente';
            
            return `${status} **${timeStr}** | 👤 ${clientName}
🎯 ${service}
📧 ${booking.profiles?.email || 'No email'}
📞 ${booking.profiles?.phone || 'No teléfono'}
💳 ${paymentStatus}
📋 ${booking.notes || 'Sin notas'}
---`;
          }).join('\n');

          const agendaMessage = `📅 **AGENDA DEL DÍA - ${today.toLocaleDateString('es-ES')}**

🏢 **THE NOOK MADRID**
👋 Hola ${userInfo.name}, aquí tienes la agenda de hoy:

${agendaList}

📊 **Resumen del día:**
• Total de citas: ${todayBookings.length}
• Confirmadas: ${todayBookings.filter((b: any) => b.status === 'confirmed').length}
• Pendientes: ${todayBookings.filter((b: any) => b.status === 'pending').length}

¿Necesitas información específica de algún cliente o ayuda con alguna reserva?`;

          return new Response(JSON.stringify({ reply: agendaMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const noBookingsMessage = `📅 **AGENDA DEL DÍA - ${today.toLocaleDateString('es-ES')}**

🏢 **THE NOOK MADRID**
👋 Hola ${userInfo.name}

📝 **No hay citas programadas para hoy**

¡Perfecto día para organizar, preparar o relajarse! 

¿Necesitas ayuda con algo más?`;

          return new Response(JSON.stringify({ reply: noBookingsMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.error('Error fetching staff schedule:', error);
      }
    }

    // Función para buscar reservas por email
    if (isSearchRequest || isCancelRequest || isModifyRequest) {
      // Extraer email del mensaje
      const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      
      if (emailMatch) {
        const email = emailMatch[0];
        
        try {
          // Buscar cliente por email
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('email', email)
            .single();

          if (clientProfile) {
            // Buscar reservas futuras del cliente
            const { data: bookings } = await supabase
              .from('bookings')
              .select(`
                id,
                booking_datetime,
                status,
                services (name, price_cents),
                notes
              `)
              .eq('client_id', clientProfile.id)
              .gte('booking_datetime', new Date().toISOString())
              .in('status', ['confirmed', 'pending'])
              .order('booking_datetime', { ascending: true });

            if (bookings && bookings.length > 0) {
              const bookingsList = bookings.map((booking: any, index: number) => {
                const date = new Date(booking.booking_datetime);
                return `${index + 1}. ${booking.services?.name || 'Servicio'} - ${date.toLocaleDateString('es-ES')} a las ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} (ID: ${booking.id.slice(0, 8)})`;
              }).join('\n');

              if (isSearchRequest) {
                // Solo mostrar reservas
                const searchMessage = `📅 **RESERVAS DE ${clientProfile.first_name} ${clientProfile.last_name}**

Reservas próximas encontradas:
${bookingsList}

¿Necesitas cancelar o modificar alguna de estas reservas? Solo dime el número o menciona "cancelar" o "modificar" junto con el número de la reserva.`;

                return new Response(JSON.stringify({ reply: searchMessage }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }

              if (isCancelRequest) {
                // Buscar número de reserva a cancelar
                const numberMatch = message.match(/\b(\d+)\b/);
                if (numberMatch) {
                  const bookingIndex = parseInt(numberMatch[0]) - 1;
                  if (bookingIndex >= 0 && bookingIndex < bookings.length) {
                    const bookingToCancel = bookings[bookingIndex];
                    
                    // Cancelar la reserva
                    const { error: cancelError } = await supabase
                      .from('bookings')
                      .update({ 
                        status: 'cancelled',
                        notes: (bookingToCancel.notes || '') + ' | Cancelada por chatbot'
                      })
                      .eq('id', bookingToCancel.id);

                    if (!cancelError) {
                      const date = new Date(bookingToCancel.booking_datetime);
                      const cancelMessage = `❌ **RESERVA CANCELADA EXITOSAMENTE**

✅ Reserva cancelada:
🎯 Servicio: ${bookingToCancel.services?.name}
📅 Fecha: ${date.toLocaleDateString('es-ES')}
⏰ Hora: ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}

Tu reserva ha sido cancelada. Si era dentro de las próximas 24 horas, es posible que apliquen cargos según nuestras políticas.

¿Necesitas ayuda con algo más?`;

                      return new Response(JSON.stringify({ reply: cancelMessage }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                      });
                    }
                  }
                } else {
                  // Mostrar lista para cancelar
                  const cancelListMessage = `❌ **CANCELAR RESERVA**

Reservas disponibles para cancelar:
${bookingsList}

Para cancelar, responde con el número de la reserva que quieres cancelar (ejemplo: "cancelar 1").`;

                  return new Response(JSON.stringify({ reply: cancelListMessage }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  });
                }
              }

              if (isModifyRequest) {
                // Detectar nueva fecha/hora en el mensaje
                const dateMatch = message.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
                const timeMatch = message.match(/(\d{1,2}[:]\d{2})/);
                const numberMatch = message.match(/\b(\d+)\b/);

                if (numberMatch && dateMatch && timeMatch) {
                  const bookingIndex = parseInt(numberMatch[0]) - 1;
                  if (bookingIndex >= 0 && bookingIndex < bookings.length) {
                    const bookingToModify = bookings[bookingIndex];
                    
                    // Construir nueva fecha
                    const newDateTime = new Date(`${dateMatch[0].replace(/[-\/]/g, '/')} ${timeMatch[0]}`);
                    
                    // Modificar la reserva
                    const { error: modifyError } = await supabase
                      .from('bookings')
                      .update({ 
                        booking_datetime: newDateTime.toISOString(),
                        notes: (bookingToModify.notes || '') + ' | Modificada por chatbot'
                      })
                      .eq('id', bookingToModify.id);

                    if (!modifyError) {
                      const modifyMessage = `✏️ **RESERVA MODIFICADA EXITOSAMENTE**

✅ Reserva actualizada:
🎯 Servicio: ${bookingToModify.services?.name}
📅 Nueva fecha: ${newDateTime.toLocaleDateString('es-ES')}
⏰ Nueva hora: ${newDateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}

Tu reserva ha sido reprogramada. Recibirás confirmación por email.

¿Necesitas ayuda con algo más?`;

                      return new Response(JSON.stringify({ reply: modifyMessage }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                      });
                    }
                  }
                } else {
                  // Mostrar lista para modificar
                  const modifyListMessage = `✏️ **MODIFICAR RESERVA**

Reservas disponibles para modificar:
${bookingsList}

Para modificar, indica el número de la reserva y la nueva fecha/hora.
Ejemplo: "modificar 1 para el 25/12/2024 a las 15:30"`;

                  return new Response(JSON.stringify({ reply: modifyListMessage }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  });
                }
              }
            } else {
              const noBookingsMessage = `🔍 **BÚSQUEDA COMPLETADA**

No se encontraron reservas futuras para ${email}.

¿Te gustaría hacer una nueva reserva?`;

              return new Response(JSON.stringify({ reply: noBookingsMessage }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          } else {
            const noClientMessage = `❓ **CLIENTE NO ENCONTRADO**

No se encontró ningún cliente con el email ${email} en nuestro sistema.

¿Te gustaría hacer una nueva reserva?`;

            return new Response(JSON.stringify({ reply: noClientMessage }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (error) {
          console.error('Error searching bookings:', error);
        }
      } else {
        // Solicitar email si no se proporciona
        const emailRequestMessage = `📧 **EMAIL REQUERIDO**

Para ${isCancelRequest ? 'cancelar' : isModifyRequest ? 'modificar' : 'buscar'} tus reservas, necesito tu email.

Por favor, proporciona tu email registrado.`;

        return new Response(JSON.stringify({ reply: emailRequestMessage }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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