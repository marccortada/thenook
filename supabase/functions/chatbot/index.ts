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
                           message.toLowerCase().includes('buscar cita') ||
                           message.toLowerCase().includes('encontrar reserva') ||
                           message.toLowerCase().includes('mi reserva') ||
                           message.toLowerCase().includes('mis citas') ||
                           message.toLowerCase().includes('reserva de') ||
                           message.toLowerCase().includes('cita de') ||
                           message.toLowerCase().includes('reserva del') ||
                           message.toLowerCase().includes('cita del') ||
                           (message.includes('@') && (message.toLowerCase().includes('reservas') || message.toLowerCase().includes('citas')));

    // Detectar consultas específicas del staff
    const isStaffScheduleRequest = isStaff && (
      message.toLowerCase().includes('citas de hoy') ||
      message.toLowerCase().includes('agenda de hoy') ||
      message.toLowerCase().includes('mis citas') ||
      message.toLowerCase().includes('horario') ||
      message.toLowerCase().includes('turnos')
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
- BÚSQUEDA AVANZADA: Puedes encontrar reservas por email, nombre, fecha o combinaciones
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

    // Función mejorada para buscar reservas por múltiples criterios
    if (isSearchRequest || isCancelRequest || isModifyRequest) {
      try {
        // Extraer email del mensaje si existe
        const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        
        // Extraer posibles nombres (palabras que empiezan con mayúscula)
        const nameMatches = message.match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b/g);
        
        // Extraer fechas (formato dd/mm, dd-mm, "hoy", "mañana", etc.)
        const dateMatches = message.match(/\b\d{1,2}[\/\-]\d{1,2}\b|\bhoy\b|\bmañana\b|\bayer\b/gi);
        
        // Extraer horas (formato HH:MM)
        const timeMatches = message.match(/\b\d{1,2}:\d{2}\b/gi);
        
        let searchResults = [];
        let searchCriteria = [];
        
        // Buscar por email si está disponible
        if (emailMatch) {
          const email = emailMatch[0];
          searchCriteria.push(`📧 Email: ${email}`);
          
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('email', email)
            .single();

          if (clientProfile) {
            const { data: bookings } = await supabase
              .from('bookings')
              .select(`
                id,
                booking_datetime,
                status,
                services (name, price_cents),
                notes,
                profiles!bookings_client_id_fkey (first_name, last_name, email)
              `)
              .eq('client_id', clientProfile.id)
              .gte('booking_datetime', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
              .in('status', ['confirmed', 'pending'])
              .order('booking_datetime', { ascending: true });
            
            searchResults = bookings || [];
          }
        }
        // Si no hay email, buscar por nombre
        else if (nameMatches && nameMatches.length > 0) {
          const firstName = nameMatches[0];
          const lastName = nameMatches.length > 1 ? nameMatches[1] : null;
          
          searchCriteria.push(`👤 Nombre: ${firstName}${lastName ? ' ' + lastName : ''}`);
          
          // Buscar clientes que coincidan con el nombre
          let clientQuery = supabase
            .from('profiles')
            .select('id, first_name, last_name, email');
          
          if (lastName) {
            clientQuery = clientQuery.ilike('first_name', `%${firstName}%`)
                                   .ilike('last_name', `%${lastName}%`);
          } else {
            clientQuery = clientQuery.or(`first_name.ilike.%${firstName}%,last_name.ilike.%${firstName}%`);
          }
          
          const { data: clients } = await clientQuery;
          
          if (clients && clients.length > 0) {
            const clientIds = clients.map(c => c.id);
            
            const { data: bookings } = await supabase
              .from('bookings')
              .select(`
                id,
                booking_datetime,
                status,
                services (name, price_cents),
                notes,
                profiles!bookings_client_id_fkey (first_name, last_name, email)
              `)
              .in('client_id', clientIds)
              .gte('booking_datetime', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
              .in('status', ['confirmed', 'pending'])
              .order('booking_datetime', { ascending: true });
            
            searchResults = bookings || [];
          }
        }
        // Búsqueda por fecha si no hay email ni nombre
        else if (dateMatches) {
          const dateString = dateMatches[0].toLowerCase();
          searchCriteria.push(`📅 Fecha: ${dateString}`);
          
          const today = new Date();
          let searchDate = today;
          
          if (dateString === 'hoy') {
            searchDate = today;
          } else if (dateString === 'mañana') {
            searchDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
          } else if (dateString === 'ayer') {
            searchDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
          } else if (dateString.match(/\d{1,2}[\/\-]\d{1,2}/)) {
            // Formato dd/mm o dd-mm
            const parts = dateString.split(/[\/\-]/);
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Meses en JS empiezan en 0
            searchDate = new Date(today.getFullYear(), month, day);
          }
          
          const startOfDay = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate());
          const endOfDay = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate() + 1);
          
          const { data: bookings } = await supabase
            .from('bookings')
            .select(`
              id,
              booking_datetime,
              status,
              services (name, price_cents),
              notes,
              profiles!bookings_client_id_fkey (first_name, last_name, email)
            `)
            .gte('booking_datetime', startOfDay.toISOString())
            .lt('booking_datetime', endOfDay.toISOString())
            .in('status', ['confirmed', 'pending'])
            .order('booking_datetime', { ascending: true });
          
          searchResults = bookings || [];
        }

        if (searchResults && searchResults.length > 0) {
          const bookingsList = searchResults.map((booking: any, index: number) => {
            const date = new Date(booking.booking_datetime);
            const clientName = `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim();
            const dateStr = date.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            return `**${index + 1}.** 👤 **${clientName}**
📧 ${booking.profiles?.email || 'Sin email'}
🎯 **${booking.services?.name || 'Servicio no especificado'}**
📅 **${dateStr}**
⏰ **${timeStr}**
💳 €${((booking.services?.price_cents || 0) / 100).toFixed(2)}
📋 ${booking.notes || 'Sin notas especiales'}
🆔 ID: ${booking.id.slice(0, 8)}
---`;
          }).join('\n');

          if (isSearchRequest) {
            const searchMessage = `🔍 **RESERVAS ENCONTRADAS**

**Criterios de búsqueda:**
${searchCriteria.join('\n')}

**Total encontradas:** ${searchResults.length} reserva${searchResults.length > 1 ? 's' : ''}

${bookingsList}

💡 **¿Qué puedes hacer?**
• Para cancelar: "cancelar reserva número X"
• Para modificar: "modificar reserva número X"
• Para más detalles: "información de la reserva X"

¿Te ayudo con alguna gestión específica?`;

            return new Response(JSON.stringify({ reply: searchMessage }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (isCancelRequest) {
            // Buscar número de reserva a cancelar
            const numberMatch = message.match(/\b(\d+)\b/);
            if (numberMatch) {
              const bookingIndex = parseInt(numberMatch[0]) - 1;
              if (bookingIndex >= 0 && bookingIndex < searchResults.length) {
                const bookingToCancel = searchResults[bookingIndex];
                
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
                  const clientName = `${bookingToCancel.profiles?.first_name || ''} ${bookingToCancel.profiles?.last_name || ''}`.trim();
                  const cancelMessage = `❌ **RESERVA CANCELADA EXITOSAMENTE**

✅ **Reserva cancelada:**
👤 Cliente: ${clientName}
📧 Email: ${bookingToCancel.profiles?.email}
🎯 Servicio: ${bookingToCancel.services?.name}
📅 Fecha: ${date.toLocaleDateString('es-ES')}
⏰ Hora: ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}

✨ La cancelación ha sido procesada correctamente en nuestro sistema.

⚠️ **Recordatorio:** Política de cancelación de 24h para evitar penalizaciones.

¿Necesitas ayuda con algo más?`;

                  return new Response(JSON.stringify({ reply: cancelMessage }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  });
                } else {
                  console.error('Error cancelling booking:', cancelError);
                }
              } else {
                const errorMessage = `❌ **Error en la cancelación**

El número de reserva "${numberMatch[0]}" no es válido. 

Por favor, selecciona un número entre 1 y ${searchResults.length}.

¿Podrías indicarme el número correcto de la reserva que deseas cancelar?`;

                return new Response(JSON.stringify({ reply: errorMessage }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
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
        } else {
          // No se encontraron reservas
          const noResultsMessage = `🔍 **No se encontraron reservas**

**Criterios de búsqueda:**
${searchCriteria.join('\n')}

💡 **Sugerencias:**
• Verifica que el email esté escrito correctamente
• Comprueba si el nombre está completo (nombre y apellido)
• Prueba con diferentes formatos de fecha (dd/mm, "hoy", "mañana")
• Las reservas se muestran desde 7 días atrás hasta futuras

**Ejemplos de búsqueda:**
• "buscar reservas juan@email.com"
• "reservas de María González"
• "citas de hoy"
• "reserva del 15/12"

¿Podrías proporcionarme más detalles o probar con otros criterios de búsqueda?`;

          return new Response(JSON.stringify({ reply: noResultsMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.error('Error searching bookings:', error);
        
        const errorMessage = `❌ **Error en la búsqueda**

Hubo un problema al buscar las reservas. Por favor:
• Intenta de nuevo en unos momentos
• Verifica que los datos estén correctos
• Contacta con el centro si el problema persiste

📞 **Contacto directo:** info@thenookmadrid.com

¿Puedo ayudarte con algo más?`;

        return new Response(JSON.stringify({ reply: errorMessage }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Llamada a OpenAI para respuestas generales
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.map((msg: any) => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje. ¿Puedes intentar de nuevo?';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chatbot function:', error);
    
    return new Response(JSON.stringify({ 
      reply: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta nuevamente.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});