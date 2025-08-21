import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
  const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "reservas@thenookmadrid.com";
  const fromEmail = "The Nook Madrid <reservas@thenookmadrid.com>";

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Falta STRIPE_SECRET_KEY en Supabase Secrets");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Falta session_id");

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paymentStatus = session.payment_status;
    const buyerEmail = (session.customer_details?.email || (session as any).customer_email || null) as string | null;

    if (paymentStatus !== "paid") {
      return new Response(JSON.stringify({ paid: false, status: paymentStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const intent = (session.metadata?.intent || session.payment_intent && typeof session.payment_intent !== 'string' ? (session.payment_intent as any).metadata?.intent : undefined) as string | undefined;

    const results: Record<string, unknown> = { intent };

    if (intent === "gift_cards") {
      const payloadRaw = session.metadata?.gc_payload;
      if (payloadRaw) {
        const payload = JSON.parse(payloadRaw) as { items: { amount_cents: number; quantity?: number }[] };
        const created: Array<{ id: string; code: string; amount_cents: number }> = [];
        for (const it of payload.items) {
          const qty = it.quantity ?? 1;
          for (let i = 0; i < qty; i++) {
            const { data: code, error: codeErr } = await supabaseAdmin.rpc("generate_voucher_code");
            if (codeErr) throw codeErr;
            const { data, error } = await supabaseAdmin
              .from("gift_cards")
              .insert({
                initial_balance_cents: it.amount_cents,
                remaining_balance_cents: it.amount_cents,
                status: "active",
                code,
              })
              .select("id, code")
              .single();
            if (error) throw error;
            created.push({ id: data.id, code: data.code, amount_cents: it.amount_cents });
          }
        }
        results.gift_cards = created;

        // Enviar emails (cliente y administrador)
        try {
          const codesHtml = created
            .map((c) => `<li><strong>${(c.amount_cents / 100).toFixed(2)}€</strong> — Código: <code>${c.code}</code></li>`) 
            .join("");

          if (buyerEmail) {
            await resend.emails.send({
              from: fromEmail,
              to: [buyerEmail],
              subject: "Confirmación de compra: Tarjetas regalo",
              html: `
                <div style="font-family: Arial, sans-serif;">
                  <h2>¡Gracias por tu compra!</h2>
                  <p>Has adquirido las siguientes tarjetas regalo:</p>
                  <ul>${codesHtml}</ul>
                  <p>Puedes canjearlas presentando el código en The Nook Madrid.</p>
                </div>
              `,
            });
          }

          if (adminEmail) {
            await resend.emails.send({
              from: fromEmail,
              to: [adminEmail],
              subject: "Nueva compra de tarjetas regalo",
              html: `
                <div style="font-family: Arial, sans-serif;">
                  <h3>Nueva compra de tarjetas regalo</h3>
                  <p>Total: ${created.length} tarjeta(s)</p>
                  <ul>${codesHtml}</ul>
                  <p>Comprador: ${buyerEmail || "desconocido"}</p>
                </div>
              `,
            });
          }
        } catch (e) {
          console.error("[verify-payment] error enviando emails gift_cards:", e);
        }
      }
    }


    if (intent === "package_voucher") {
      const pvRaw = session.metadata?.pv_payload;
      if (pvRaw) {
        const pv = JSON.parse(pvRaw) as {
          package_id: string;
          mode?: "self" | "gift";
          buyer?: { name: string; email: string; phone?: string };
          recipient?: { name: string; email: string; phone?: string };
          notes?: string;
        };
        // Reuse logic similar to purchase-voucher function
        const { data: pkg, error: pkgErr } = await supabaseAdmin
          .from("packages")
          .select("id, sessions_count, price_cents, name, active")
          .eq("id", pv.package_id)
          .single();
        if (pkgErr || !pkg || !pkg.active) throw new Error("Paquete no disponible");

        const target = pv.mode === "gift" ? pv.recipient : pv.buyer;
        if (!target?.email || !target?.name) throw new Error("Datos del destinatario incompletos");

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

        const { data: code, error: codeErr } = await supabaseAdmin.rpc("generate_voucher_code");
        if (codeErr) throw codeErr;

        const extraNotes = [
          pv.notes?.trim() || "",
          pv.mode === "gift"
            ? `Regalo de: ${pv.buyer?.name} <${pv.buyer?.email}>${pv.buyer?.phone ? " · "+pv.buyer.phone : ""}`
            : `Comprado por el propio cliente`,
        ]
          .filter(Boolean)
          .join(" | ");

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

        results.client_package = createdPkg;

        // Enviar emails (destinatario, comprador y admin)
        try {
          const recipientEmail = (pv.mode === "gift" ? pv.recipient?.email : pv.buyer?.email) || null;
          const recipientName = (pv.mode === "gift" ? pv.recipient?.name : pv.buyer?.name) || "";
          const buyerEmailFinal = pv.buyer?.email || buyerEmail;

          const detailsHtml = `
            <div style="font-family: Arial, sans-serif;">
              <h2>Tu bono ${pkg.name}</h2>
              <p>Hola ${recipientName || ""}, aquí tienes tu bono:</p>
              <ul>
                <li>Código del bono: <strong>${createdPkg.voucher_code}</strong></li>
                <li>Sesiones incluidas: ${pkg.sessions_count}</li>
              </ul>
              <p>¡Gracias por tu compra!</p>
            </div>`;

          if (recipientEmail) {
            await resend.emails.send({
              from: fromEmail,
              to: [recipientEmail],
              subject: `Tu bono ${pkg.name} — Código ${createdPkg.voucher_code}`,
              html: detailsHtml,
            });
          }

          if (buyerEmailFinal && (!recipientEmail || buyerEmailFinal.toLowerCase() !== recipientEmail.toLowerCase())) {
            await resend.emails.send({
              from: fromEmail,
              to: [buyerEmailFinal],
              subject: `Confirmación: Bono ${pkg.name}`,
              html: `
                <div style="font-family: Arial, sans-serif;">
                  <h3>Confirmación de compra</h3>
                  <p>Se ha generado el bono <strong>${pkg.name}</strong> con código <strong>${createdPkg.voucher_code}</strong>.</p>
                  <p>Destinatario: ${recipientName || buyerEmailFinal}</p>
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
                    <li>Comprador: ${pv.buyer?.name || ""} &lt;${pv.buyer?.email || buyerEmail || ""}&gt;</li>
                    <li>Modo: ${pv.mode || "self"}</li>
                  </ul>
                </div>
              `,
            });
          }
        } catch (e) {
          console.error("[verify-payment] error enviando emails package_voucher:", e);
        }
      }
    }


    if (intent === "booking_payment") {
      const bpRaw = session.metadata?.bp_payload;
      if (bpRaw) {
        const bp = JSON.parse(bpRaw) as { booking_id: string };
        const { error } = await supabaseAdmin
          .from("bookings")
          .update({ payment_status: "completed", stripe_session_id: session.id })
          .eq("id", bp.booking_id);
        if (error) throw error;
        results.booking_updated = true;

        // Enviar emails de confirmación de pago de reserva
        try {
          const subject = "Pago de reserva confirmado";
          const html = `
            <div style=\"font-family: Arial, sans-serif;\"> 
              <h3>Pago confirmado</h3>
              <p>Tu pago de la reserva se ha confirmado correctamente.</p>
              <p>ID de sesión Stripe: ${session.id}</p>
            </div>`;
          if (buyerEmail) {
            await resend.emails.send({ from: fromEmail, to: [buyerEmail], subject, html });
          }
          if (adminEmail) {
            await resend.emails.send({ from: fromEmail, to: [adminEmail], subject: `ADMIN · ${subject}`, html });
          }
        } catch (e) {
          console.error("[verify-payment] error enviando emails booking_payment:", e);
        }
      }
    }

    return new Response(JSON.stringify({ paid: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[verify-payment] error:", err);
    return new Response(JSON.stringify({ error: err.message || "Error interno" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
