import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, capabilities } = await req.json();

    if (!message) {
      throw new Error('No message provided');
    }

    const systemPrompt = `Eres un asistente virtual especializado para THE NOOK MADRID, centros de masajes y wellness en Madrid.

CAPACIDADES ESPECIALES DEL SISTEMA:
${capabilities && capabilities.includes('gestionar_reservas') ? `
- GESTIÓN DE RESERVAS: Puedes ayudar a buscar, modificar y cancelar reservas existentes
- BÚSQUEDA POR EMAIL: Cuando un cliente proporcione su email, puedes encontrar sus reservas y bonos
- CONSULTA DE BONOS: Puedes mostrar bonos activos, sesiones restantes y fechas de caducidad
` : ''}

INFORMACIÓN GENERAL:
- THE NOOK tiene 2 centros en Madrid: Zurbarán (Chamberí) y Concha Espina (Chamartín)
- Somos especialistas en masajes y terapia manual
- Calificación: 4.9/5 basado en 989 reseñas de Google
- Utilizamos la plataforma de pago seguro Stripe Inc.
- Trabajamos sin cobro por adelantado

GESTIÓN DE RESERVAS EXISTENTES:
Si un cliente quiere gestionar sus reservas existentes:
1. SOLICITA SU EMAIL: "Por favor, proporciona tu email para buscar tus reservas"
2. BUSCA EN SISTEMA: Una vez tengas el email, busco automáticamente sus reservas
3. MUESTRA OPCIONES: Presento sus reservas futuras y bonos activos
4. PERMITE ACCIONES: Puede cancelar, modificar o consultar detalles

PARA CANCELAR UNA RESERVA:
- Solicito confirmación del email del cliente
- Muestro sus reservas próximas
- Permito cancelar con confirmación
- Explico política de cancelación

PARA MODIFICAR UNA RESERVA:
- Verifico email del cliente
- Muestro reservas actuales
- Ofrezco opciones de reprogramación
- Verifico nueva disponibilidad

CONSULTA DE BONOS Y PAQUETES:
- Muestro bonos activos del cliente
- Indico sesiones restantes
- Alerto sobre fechas de caducidad próximas
- Sugiero usar bonos antes del vencimiento

SERVICIOS DISPONIBLES EN EL SISTEMA:

MASAJES:
1. Masaje Descontracturante - Para aliviar tensiones musculares y contracturas
2. Masaje Relajante - Para relajación profunda y bienestar general
3. Masaje Deportivo - Especializado para deportistas y actividad física
4. Masaje para Dos (en pareja) - Experiencia compartida en cabinas dobles
5. Masaje Futura Mamá - Especializado para embarazadas (OBLIGATORIO avisar al reservar)
6. Masaje a Cuatro Manos - Experiencia única con dos terapeutas
7. Masaje con Piedras Calientes - Terapia con termoterapia
8. Masaje Piernas Cansadas - Específico para mejorar circulación
9. Drenaje Linfático - Para desintoxicación y reducción de retención
10. Reflexología Podal - Terapia a través de puntos reflejos en los pies

RITUALES:
- Ritual Energizante - Tratamiento completo revitalizante
- Otros rituales especializados según necesidades

POLÍTICAS DE RESERVA:
- Para embarazadas: OBLIGATORIO informar al hacer la reserva
- Confirmación automática por email con dirección del centro correcto
- SMS recordatorio 24h antes de la cita
- Política de cancelación: 24h de antelación sin penalización
- THE NOOK no se hace responsable si el cliente va al centro equivocado

CENTROS DISPONIBLES:
1. ZURBARÁN (Chamberí) - Centro principal
2. CONCHA ESPINA (Chamartín) - Segundo centro

INSTRUCCIONES PARA GESTIÓN DE RESERVAS:
- SIEMPRE solicita el email del cliente para búsquedas
- Confirma identidad antes de mostrar información personal
- Explica claramente las opciones disponibles
- Para cancelaciones, confirma dos veces la acción
- Para modificaciones, verifica nueva disponibilidad
- Mantén un tono profesional y empático
- Si no puedes realizar una acción, explica cómo contactar con el centro`;

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