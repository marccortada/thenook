import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY || !RESEND_KEY) {
  throw new Error("Missing Supabase or Resend environment variables");
}

const resend = new Resend(RESEND_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const {
      data: userData,
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const clientPackageId = body?.client_package_id as string | undefined;
    if (!clientPackageId) {
      return new Response(JSON.stringify({ error: "client_package_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: clientPackage, error: packageError } = await supabaseAdmin
      .from("client_packages")
      .select("id,voucher_code,total_sessions,used_sessions,client_id,package_id")
      .eq("id", clientPackageId)
      .single();

    if (packageError || !clientPackage) {
      console.error("[send-voucher-remaining] package fetch error", packageError);
      return new Response(JSON.stringify({ error: "Voucher not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email,first_name,last_name")
      .eq("id", clientPackage.client_id)
      .single();

    if (profileError || !profile?.email) {
      console.error("[send-voucher-remaining] profile fetch error", profileError);
      return new Response(JSON.stringify({ error: "Recipient email not available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: packageInfo, error: packageInfoError } = await supabaseAdmin
      .from("packages")
      .select("name,center_id,centers(name,address_concha_espina,address_zurbaran)")
      .eq("id", clientPackage.package_id)
      .single();

    if (packageInfoError) {
      console.error("[send-voucher-remaining] package info error", packageInfoError);
    }

    const email = profile.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "Recipient email not available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    const recipientName = `${firstName} ${lastName}`.trim() || "cliente";

    const totalSessions = clientPackage.total_sessions ?? 0;
    const usedSessions = clientPackage.used_sessions ?? 0;
    const remainingSessions = Math.max(totalSessions - usedSessions, 0);

    const packageName = packageInfo?.name || "Bono The Nook";
    const voucherCode = clientPackage.voucher_code;

    const centerName = packageInfo?.centers?.name || "";
    const isZurbaran = centerName.toLowerCase().includes("zurbar");
    const location = isZurbaran ? "ZURBARÁN" : "CONCHA ESPINA";
    const mapLink = isZurbaran
      ? "https://maps.app.goo.gl/fEWyBibeEFcQ3isN6"
      : "https://goo.gl/maps/zHuPpdHATcJf6QWX8";
    const address = isZurbaran
      ? packageInfo?.centers?.address_zurbaran ||
        "C/ Zurbarán 10 (Metro Alonso Martínez / Rubén Darío)"
      : packageInfo?.centers?.address_concha_espina ||
        "C/ Príncipe de Vergara 204 posterior (A la espalda del 204) - Bordeando el Restaurante 'La Ancha' (Metro Concha Espina salida Plaza de Cataluña)";

    const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "reservas@gnerai.com";
    const fromEmail = "The Nook Madrid <reservas@gnerai.com>";
    const year = new Date().getFullYear();

    const emailHtml = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Actualización de tu bono — THE NOOK</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>

  <body style="margin:0; padding:0; font-family:Arial,Helvetica,sans-serif; background:#f8f9fb; color:#111;">
    <center style="width:100%; background:#f8f9fb;">
      <table role="presentation" width="100%" style="max-width:600px; margin:auto; background:white; border-radius:12px; box-shadow:0 3px 10px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#424CB8,#1A6AFF); color:#fff; text-align:center; padding:24px; border-radius:12px 12px 0 0;">
            <h1 style="margin:0; font-size:20px;">🎟️ Actualización de tu bono</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:24px;">
            <p>Hola <strong>${recipientName}</strong>!</p>
            <p>Hemos registrado un uso de tu bono <strong>${packageName}</strong>.</p>

            <div style="margin:18px 0; padding:16px; background:#f3f6ff; border-radius:8px; border:1px solid #e2e8ff;">
              <p style="margin:0; font-size:15px; color:#0f172a;">
                Te quedan <strong style="font-size:18px; color:#1A6AFF;">${remainingSessions}/${totalSessions}</strong> sesiones disponibles.<br>
                Código del bono: <strong style="font-size:16px;">${voucherCode}</strong>
              </p>
            </div>

            <p>Recuerda que puedes disfrutar de tu bono en nuestro centro de <strong>${location}</strong>:</p>
            <p>${address}</p>
            <p>Estamos aquí 👉 <a href="${mapLink}" target="_blank" style="color:#fff !important; text-decoration:none; background:#424CB8; padding:10px 16px; border-radius:8px; font-weight:700; display:inline-block;">Ver mapa</a></p>

            <p>Si crees que hay algún error en el conteo de sesiones, contáctanos respondiendo a este correo o por teléfono.</p>

            <hr style="border:none; border-top:1px solid #eee; margin:20px 0;">
            <p><strong>THE NOOK ${location}</strong><br>
              911 481 474 / 622 360 922<br>
              <a href="mailto:reservas@gnerai.com" style="color:#1A6AFF;">reservas@gnerai.com</a>
            </p>
          </td>
        </tr>
      </table>

      <p style="font-size:11px; color:#9ca3af; margin:20px auto; max-width:600px;">
        © ${year} THE NOOK Madrid — Este correo se ha generado automáticamente.<br>
        Si no reconoces este canje, por favor contáctanos lo antes posible.
      </p>
    </center>
  </body>
</html>
`;

    await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: `Quedan ${remainingSessions}/${totalSessions} sesiones en tu bono`,
      html: emailHtml,
    });

    if (adminEmail) {
      await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        subject: `Uso registrado · Bono ${voucherCode}`,
        html: emailHtml,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[send-voucher-remaining] error", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
