import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, role = 'admin' } = await req.json()

    if (!email) {
      throw new Error('Email requerido')
    }

    // Solo permitimos elevar perfiles conocidos (seguridad básica)
    const allowed = ['admin@thenookmadrid.com', 'work@thenookmadrid.com']
    if (!allowed.includes(email)) {
      throw new Error('Email no autorizado')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    // Buscar usuario por email
    const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listErr) throw listErr

    const user = usersList.users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase())
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Usuario no encontrado en auth' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 })
    }

    // Intentar obtener perfil existente
    const { data: existingProfile, error: profileFetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, role, is_staff, is_active')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileFetchErr) {
      console.error('profileFetchErr', profileFetchErr)
    }

    if (existingProfile) {
      const { error: updErr } = await supabaseAdmin
        .from('profiles')
        .update({ role, is_staff: true, is_active: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      if (updErr) throw updErr
    } else {
      // Crear perfil mínimo
      const { error: insErr } = await supabaseAdmin
        .from('profiles')
        .insert({ user_id: user.id, email, role, is_staff: true, is_active: true })
      if (insErr) throw insErr
    }

    return new Response(JSON.stringify({ success: true, user_id: user.id, role }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error: any) {
    console.error('Error ensure-admin-profile:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Error interno' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})