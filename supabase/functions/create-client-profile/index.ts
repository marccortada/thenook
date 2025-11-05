import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as Payload;
    const email = payload.email?.trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email es obligatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      console.error("[create-client-profile] Error fetching profile", fetchError);
      throw fetchError;
    }

    const firstName = payload.first_name?.trim() || null;
    const lastName = payload.last_name?.trim() || null;
    const phone = payload.phone?.trim() || null;

    let profile;

    if (existingProfile) {
      const updatePayload: Record<string, unknown> = {};
      if (firstName) updatePayload.first_name = firstName;
      if (lastName) updatePayload.last_name = lastName;
      if (phone !== null) updatePayload.phone = phone;

      if (Object.keys(updatePayload).length > 0) {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            ...updatePayload,
            role: existingProfile.role ?? "client",
          })
          .eq("id", existingProfile.id)
          .select()
          .maybeSingle();

        if (updateError) {
          console.error("[create-client-profile] Error updating profile", updateError);
          throw updateError;
        }
        profile = updated ?? existingProfile;
      } else {
        profile = existingProfile;
      }
    } else {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          role: "client",
        })
        .select()
        .single();

      if (insertError) {
        console.error("[create-client-profile] Error inserting profile", insertError);
        throw insertError;
      }
      profile = inserted;
    }

    return new Response(JSON.stringify({ profile }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[create-client-profile] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error interno" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
