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

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

interface AnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  themes: string[];
  suggestedActions: string[];
  riskLevel: number; // 0-100
  summary: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noteId, content, title, category, clientId, mode = 'single' } = await req.json();

    console.log(`Starting analysis for ${mode} mode, noteId: ${noteId}`);

    if (mode === 'batch') {
      // Analizar todas las notas sin análisis
      return await processBatchAnalysis();
    } else {
      // Analizar una nota específica
      if (!content || !noteId) {
        throw new Error('Note content and ID are required for single analysis');
      }
      
      const analysis = await analyzeNote(content, title, category);
      
      // Guardar análisis en la nota
      await saveAnalysisToNote(noteId, analysis);
      
      // Verificar si necesita crear alertas
      await checkAndCreateAlerts(clientId, analysis, content, title);
      
      return new Response(JSON.stringify({ 
        success: true, 
        analysis,
        message: 'Note analyzed successfully' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in analyze-client-notes:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeNote(content: string, title?: string, category?: string): Promise<AnalysisResult> {
  const analysisPrompt = `
Analiza la siguiente nota de cliente de un centro de masajes y wellness llamado THE NOOK MADRID.

INFORMACIÓN DE LA NOTA:
Título: ${title || 'Sin título'}
Categoría: ${category || 'general'}
Contenido: ${content}

INSTRUCCIONES DE ANÁLISIS:
Realiza un análisis completo y devuelve SOLO un JSON válido con esta estructura exacta:

{
  "sentiment": "positive" | "negative" | "neutral",
  "urgency": "low" | "medium" | "high" | "critical",
  "themes": ["tema1", "tema2", "tema3"],
  "suggestedActions": ["acción1", "acción2"],
  "riskLevel": 0-100,
  "summary": "resumen breve de la nota en español"
}

CRITERIOS DE ANÁLISIS:

SENTIMENT:
- "positive": Satisfacción, elogios, experiencia positiva
- "negative": Quejas, insatisfacción, problemas, dolor
- "neutral": Información objetiva, neutral

URGENCY:
- "critical": Emergencia médica, lesión grave, cliente muy molesto
- "high": Dolor severo, queja importante, problema que requiere atención inmediata
- "medium": Molestia moderada, seguimiento necesario, preferencias especiales
- "low": Información general, comentarios positivos, notas rutinarias

THEMES (máximo 3):
Ejemplos: "dolor_espalda", "satisfaccion_servicio", "problema_horario", "alergia", "embarazo", "lesion_deportiva", "preferencia_terapeuta", "problema_pago", "experiencia_negativa", "recomendacion"

SUGGESTED ACTIONS (máximo 2):
Acciones específicas recomendadas basadas en el contenido.

RISK LEVEL (0-100):
- 0-25: Sin riesgo, cliente satisfecho
- 26-50: Riesgo bajo, seguimiento rutinario
- 51-75: Riesgo medio, atención necesaria
- 76-100: Riesgo alto, acción inmediata requerida

SUMMARY:
Resumen en español de máximo 100 caracteres.

Responde ÚNICAMENTE con el JSON, sin texto adicional.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: analysisPrompt }],
      max_tokens: 300,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const analysisText = data.choices[0].message.content;
  
  try {
    const analysis: AnalysisResult = JSON.parse(analysisText);
    console.log('Analysis completed:', analysis);
    return analysis;
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', analysisText);
    throw new Error('Failed to parse analysis result');
  }
}

async function saveAnalysisToNote(noteId: string, analysis: AnalysisResult) {
  const { error } = await supabase
    .from('client_notes')
    .update({
      // Guardar análisis en campos JSON o texto
      priority: analysis.urgency,
      updated_at: new Date().toISOString()
    })
    .eq('id', noteId);

  if (error) {
    console.error('Error saving analysis to note:', error);
    throw error;
  }

  // Guardar análisis detallado en tabla separada
  const { error: analysisError } = await supabase
    .from('note_analysis')
    .upsert({
      note_id: noteId,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      themes: analysis.themes,
      suggested_actions: analysis.suggestedActions,
      risk_level: analysis.riskLevel,
      summary: analysis.summary,
      analyzed_at: new Date().toISOString()
    });

  if (analysisError) {
    console.error('Error saving detailed analysis:', analysisError);
    // No lanzar error aquí, es tabla opcional
  }
}

async function checkAndCreateAlerts(clientId: string, analysis: AnalysisResult, content: string, title: string) {
  // Crear alertas para casos críticos o de alto riesgo
  if (analysis.urgency === 'critical' || analysis.riskLevel >= 75 || analysis.sentiment === 'negative') {
    
    // Verificar si ya existe una alerta reciente para este cliente
    const { data: existingAlerts } = await supabase
      .from('client_alerts')
      .select('id')
      .eq('client_id', clientId)
      .eq('resolved', false)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24h

    if (!existingAlerts || existingAlerts.length === 0) {
      const alertMessage = generateAlertMessage(analysis, title, content);
      
      const { error: alertError } = await supabase
        .from('client_alerts')
        .insert({
          client_id: clientId,
          alert_type: analysis.urgency,
          message: alertMessage,
          risk_level: analysis.riskLevel,
          created_at: new Date().toISOString(),
          resolved: false
        });

      if (alertError) {
        console.error('Error creating alert:', alertError);
      } else {
        console.log('Alert created for client:', clientId);
      }
    }
  }
}

function generateAlertMessage(analysis: AnalysisResult, title: string, content: string): string {
  const urgencyEmoji = {
    critical: '🚨',
    high: '⚠️',
    medium: '📋',
    low: '📝'
  };

  const sentimentEmoji = {
    negative: '😟',
    neutral: '😐',
    positive: '😊'
  };

  return `${urgencyEmoji[analysis.urgency]} ${sentimentEmoji[analysis.sentiment]} ${title}

📝 Resumen: ${analysis.summary}
🎯 Temas: ${analysis.themes.join(', ')}
📊 Nivel de riesgo: ${analysis.riskLevel}%

💡 Acciones sugeridas:
${analysis.suggestedActions.map(action => `• ${action}`).join('\n')}`;
}

async function processBatchAnalysis() {
  console.log('Starting batch analysis...');
  
  // Obtener notas sin análisis de los últimos 30 días
  const { data: notes, error } = await supabase
    .from('client_notes')
    .select(`
      id,
      title,
      content,
      category,
      client_id,
      created_at
    `)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .is('priority', null) // Notas sin análisis previo
    .limit(50); // Procesar máximo 50 notas por vez

  if (error) {
    throw new Error(`Error fetching notes: ${error.message}`);
  }

  if (!notes || notes.length === 0) {
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'No notes found for batch analysis',
      processed: 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let processed = 0;
  let errors = 0;

  for (const note of notes) {
    try {
      console.log(`Processing note ${note.id}...`);
      
      const analysis = await analyzeNote(note.content, note.title, note.category);
      await saveAnalysisToNote(note.id, analysis);
      await checkAndCreateAlerts(note.client_id, analysis, note.content, note.title);
      
      processed++;
      
      // Pausa pequeña para evitar rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error processing note ${note.id}:`, error);
      errors++;
    }
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: `Batch analysis completed. Processed: ${processed}, Errors: ${errors}`,
    processed,
    errors 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}