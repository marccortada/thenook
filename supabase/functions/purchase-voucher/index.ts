import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { package_id, mode, buyer, recipient, notes } = body ?? {};

    if (!package_id || !buyer?.email || !buyer?.name) {
      throw new Error("Faltan datos obligatorios");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
    const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "reservas@gnerai.com";
    const fromEmail = "The Nook Madrid <reservas@gnerai.com>";

    // Obtener info del paquete
    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from("packages")
      .select("id, sessions_count, price_cents, name")
      .eq("id", package_id)
      .eq("active", true)
      .single();
    if (pkgErr || !pkg) throw new Error("Paquete no disponible");

    const target = mode === "gift" ? recipient : buyer;
    if (!target?.email || !target?.name) throw new Error("Datos del destinatario incompletos");

    // Buscar o crear perfil destinatario
    const { data: existing, error: findErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", target.email.toLowerCase())
      .maybeSingle();
    if (findErr) throw findErr;

    let clientId = existing?.id as string | undefined;
    if (!clientId) {
      const [first, ...rest] = target.name.trim().split(" ");
      const { data: created, error: createErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          email: target.email.toLowerCase(),
          first_name: first,
          last_name: rest.join(" ") || null,
          phone: target.phone || null,
          role: "client",
        })
        .select("id")
        .single();
      if (createErr) throw createErr;
      clientId = created.id;
    }

    // Generar voucher code
    const { data: code, error: codeErr } = await supabaseAdmin.rpc("generate_voucher_code");
    if (codeErr) throw codeErr;

    const extraNotes = [
      notes?.trim() || "",
      mode === "gift"
        ? `Regalo de: ${buyer.name} <${buyer.email}>${buyer.phone ? " · "+buyer.phone : ""}`
        : `Comprado por el propio cliente`,
    ]
      .filter(Boolean)
      .join(" | ");

    // Crear el bono
    const { data: createdPkg, error: insertErr } = await supabaseAdmin
      .from("client_packages")
      .insert({
        client_id: clientId,
        package_id: pkg.id,
        purchase_price_cents: pkg.price_cents,
        total_sessions: pkg.sessions_count,
        voucher_code: code,
        notes: extraNotes || null,
      })
      .select("id, voucher_code")
      .single();
    if (insertErr) throw insertErr;

    // Enviar emails (destinatario, comprador y admin)
    try {
      const recipientEmail = target.email;
      const recipientName = target.name;
      await resend.emails.send({
        from: fromEmail,
        to: [recipientEmail],
        subject: `Tu bono ${pkg.name} — Código ${createdPkg.voucher_code}`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Tu bono ${pkg.name}</h2>
            <p>Hola ${recipientName}, aquí tienes tu bono:</p>
            <ul>
              <li>Código del bono: <strong>${createdPkg.voucher_code}</strong></li>
              <li>Sesiones incluidas: ${pkg.sessions_count}</li>
            </ul>
            <p>¡Gracias por tu compra!</p>
          </div>
        `,
      });

      if (buyer?.email && buyer.email.toLowerCase() !== recipientEmail.toLowerCase()) {
        await resend.emails.send({
          from: fromEmail,
          to: [buyer.email],
          subject: `Confirmación: Bono ${pkg.name}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h3>Confirmación de compra</h3>
              <p>Se ha generado el bono <strong>${pkg.name}</strong> con código <strong>${createdPkg.voucher_code}</strong>.</p>
              <p>Destinatario: ${recipientName} &lt;${recipientEmail}&gt;</p>
            </div>
          `,
        });
      }

      if (adminEmail) {
        await resend.emails.send({
          from: fromEmail,
          to: [adminEmail],
          subject: `Nueva compra de bono: ${pkg.name}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h3>Nueva compra de bono</h3>
              <ul>
                <li>Paquete: ${pkg.name}</li>
                <li>Código: ${createdPkg.voucher_code}</li>
                <li>Sesiones: ${pkg.sessions_count}</li>
                <li>Comprador: ${buyer?.name || ""} &lt;${buyer?.email || ""}&gt;</li>
                <li>Modo: ${mode || "self"}</li>
              </ul>
            </div>
          `,
        });
      }
    } catch (e) {
      console.error("[purchase-voucher] error enviando emails:", e);
    }

    return new Response(
      JSON.stringify({ success: true, voucher_code: createdPkg.voucher_code }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("purchase-voucher error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Error interno" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
