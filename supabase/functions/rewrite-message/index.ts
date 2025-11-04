import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  text: string;
  tone?: 'amable' | 'conciso' | 'profesional' | string;
  language?: 'es' | 'en' | string;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors });
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'OPENAI_API_KEY missing' }), { headers: { ...cors, 'Content-Type': 'application/json' }, status: 200 });
    }

    const body = (await req.json()) as Body;
    const input = (body.text || '').toString().slice(0, 2000); // límite prudente
    const tone = body.tone || 'amable';
    const lang = (body.language || 'es').startsWith('en') ? 'en' : 'es';
    if (!input) {
      return new Response(JSON.stringify({ ok: false, error: 'text is required' }), { headers: { ...cors, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Prompt seguro: no incluimos PII adicional; reescritura ligera
    const system = lang === 'en'
      ? `You are a helpful assistant rewriting very short customer messages for a wellness center. Keep meaning, keep URLs, keep numbers, do not invent facts. Style: ${tone}. Answer only with the rewritten message.`
      : `Eres un asistente que reescribe mensajes cortos para un centro de bienestar. Mantén el significado, conserva URLs y números, no inventes datos. Estilo: ${tone}. Responde solo con el texto reescrito.`;

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: input },
      ],
      temperature: 0.2,
      max_tokens: 400,
    } as const;

    const resp = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ ok: false, error: `OpenAI error: ${resp.status} ${errText}` }), { headers: { ...cors, 'Content-Type': 'application/json' }, status: 200 });
    }
    const data = await resp.json();
    const result = data?.choices?.[0]?.message?.content || input;
    return new Response(JSON.stringify({ ok: true, result }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { headers: { ...cors, 'Content-Type': 'application/json' }, status: 200 });
  }
});

