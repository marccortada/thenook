import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function decodeJwt(token: string) {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors });

    const { voucher_id, note } = await req.json();
    if (!voucher_id) return new Response(JSON.stringify({ ok: false, error: 'voucher_id is required' }), { headers: { ...cors, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Extraer actor del JWT (si viene)
    const auth = req.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const claims = token ? decodeJwt(token) : null;
    const actorUserId = claims?.sub || null;
    const actorEmail = claims?.email || null;

    // Llamar a función transaccional
    const { data, error } = await supabase.rpc('use_voucher_session', {
      p_voucher_id: voucher_id,
      p_note: note || null,
      p_actor_user_id: actorUserId,
      p_actor_email: actorEmail,
    });

    if (error) {
      const msg = (error as any).message || '';
      const status = /no remaining/i.test(msg) ? 409 : /not active|permission/i.test(msg) ? 403 : 400;
      return new Response(JSON.stringify({ ok: false, error: msg || 'Failed to use session' }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const res = Array.isArray(data) ? data[0] : data;
    return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});

