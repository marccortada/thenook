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
    const { email, password } = await req.json()
    
    // Verificar que sea el email específico que queremos crear
    if (email !== 'work@thenookmadrid.com') {
      throw new Error('Solo se puede crear el usuario work@thenookmadrid.com')
    }

    // Crear cliente admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Crear usuario usando admin API
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: 'Staff',
        last_name: 'Employee'
      }
    })

    if (userError) {
      throw userError
    }

    // Actualizar perfil para que sea staff
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: 'employee', 
        is_staff: true, 
        is_active: true 
      })
      .eq('user_id', user.user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuario creado exitosamente',
        user_id: user.user.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})