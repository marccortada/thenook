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

  // Try to get base64 of template from Supabase Storage bucket 'gift-cards/template.png'
  async function getGiftCardTemplateBase64(client: ReturnType<typeof createClient>): Promise<string | null> {
    try {
      // @ts-ignore - storage types not imported here
      const { data, error } = await (client as any).storage.from('gift-cards').download('template.png');
      if (error || !data) return null;
      const arrayBuffer = await data.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return `data:image/png;base64,${base64}`;
    } catch (_e) {
      return null;
    }
  }

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
        const payload = JSON.parse(payloadRaw) as { 
          items: { 
            amount_cents: number; 
            quantity?: number;
            purchased_by_name?: string;
            purchased_by_email?: string;
            is_gift?: boolean;
            recipient_name?: string;
            recipient_email?: string;
            gift_message?: string;
          }[] 
        };
        
        const created: Array<{ 
          id: string; 
          code: string; 
          amount_cents: number;
          purchased_by_name?: string;
          purchased_by_email?: string;
          is_gift?: boolean;
          recipient_name?: string;
          recipient_email?: string;
          gift_message?: string;
        }> = [];
        
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
                purchased_by_name: it.purchased_by_name,
                purchased_by_email: it.purchased_by_email || buyerEmail,
              })
              .select("id, code")
              .single();
            if (error) throw error;
            
            created.push({ 
              id: data.id, 
              code: data.code, 
              amount_cents: it.amount_cents,
              purchased_by_name: it.purchased_by_name,
              purchased_by_email: it.purchased_by_email,
              is_gift: it.is_gift,
              recipient_name: it.recipient_name,
              recipient_email: it.recipient_email,
              gift_message: it.gift_message
            });
          }
        }
        results.gift_cards = created;

        // Enviar emails con imagen de tarjeta regalo
        try {
          for (const card of created) {
            // Crear imagen SVG de la tarjeta regalo
            const giftCardImage = `data:image/svg+xml;base64,${btoa(`
              <svg width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#EC4899;stop-opacity:1" />
                  </linearGradient>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="3" dy="3" stdDeviation="3" flood-opacity="0.3"/>
                  </filter>
                </defs>
                
                <!-- Card background -->
                <rect x="10" y="10" width="380" height="230" rx="15" ry="15" 
                      fill="url(#cardGradient)" filter="url(#shadow)"/>
                
                <!-- Decorative elements -->
                <circle cx="350" cy="50" r="30" fill="white" opacity="0.2"/>
                <circle cx="50" cy="200" r="25" fill="white" opacity="0.15"/>
                
                <!-- Title -->
                <text x="200" y="50" text-anchor="middle" 
                      font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">
                  TARJETA REGALO
                </text>
                
                <!-- Brand -->
                <text x="200" y="75" text-anchor="middle" 
                      font-family="Arial, sans-serif" font-size="16" fill="white" opacity="0.9">
                  The Nook Madrid
                </text>
                
                <!-- Amount -->
                <text x="200" y="120" text-anchor="middle" 
                      font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white">
                  ${(card.amount_cents / 100).toFixed(2)}€
                </text>
                
                <!-- Code -->
                <rect x="80" y="150" width="240" height="40" rx="8" ry="8" fill="white" opacity="0.9"/>
                <text x="200" y="175" text-anchor="middle" 
                      font-family="monospace" font-size="18" font-weight="bold" fill="#333">
                  ${card.code}
                </text>
                
                <!-- Instructions -->
                <text x="200" y="210" text-anchor="middle" 
                      font-family="Arial, sans-serif" font-size="12" fill="white" opacity="0.8">
                  Presenta este código en tu visita
                </text>
              </svg>
            `)}`;

            const purchaserEmail = card.purchased_by_email || buyerEmail;
            const isGift = card.is_gift;
            const recipientEmail = card.recipient_email;
            const recipientName = card.recipient_name;
            const purchaserName = card.purchased_by_name;
            const giftMessage = card.gift_message;

            // Email al destinatario (si es regalo) o comprador
            const finalRecipientEmail = isGift ? recipientEmail : purchaserEmail;
            const finalRecipientName = isGift ? recipientName : purchaserName;
            
            if (finalRecipientEmail) {
              const recipientSubject = isGift 
                ? `🎁 ¡Has recibido una tarjeta regalo de ${purchaserName || 'alguien especial'}!`
                : "Tu tarjeta regalo de The Nook Madrid";
                
              const recipientHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="text-align: center; padding: 20px;">
                    <h2 style="color: #8B5CF6;">${isGift ? '🎁 ¡Has recibido una tarjeta regalo!' : '✨ Tu tarjeta regalo'}</h2>
                    ${isGift ? `<p style="font-size: 18px; color: #666;">De parte de: <strong>${purchaserName || 'Alguien especial'}</strong></p>` : ''}
                    ${giftMessage ? `<div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic; color: #666;">"${giftMessage}"</div>` : ''}
                    
                    <div style="margin: 30px 0;">
                      <img src="${giftCardImage}" alt="Tarjeta Regalo" style="max-width: 100%; height: auto; border-radius: 15px;"/>
                    </div>
                    
                    <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                      <h3 style="color: #1e40af; margin-top: 0;">¿Cómo usar tu tarjeta regalo?</h3>
                      <ol style="text-align: left; color: #374151;">
                        <li>Reserva tu cita llamando al <strong>+34 XXX XXX XXX</strong></li>
                        <li>Presenta el código <strong>${card.code}</strong> al llegar</li>
                        <li>¡Disfruta de tu experiencia relajante!</li>
                      </ol>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                      Esta tarjeta regalo tiene un valor de <strong>${(card.amount_cents / 100).toFixed(2)}€</strong><br>
                      Válida en The Nook Madrid
                    </p>
                  </div>
                </div>
              `;
              
              await resend.emails.send({
                from: fromEmail,
                to: [finalRecipientEmail],
                subject: recipientSubject,
                html: recipientHtml,
              });
            }

            // Email al comprador (si es regalo y es diferente del destinatario)
            if (isGift && purchaserEmail && purchaserEmail.toLowerCase() !== recipientEmail?.toLowerCase()) {
              const purchaserHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="text-align: center; padding: 20px;">
                    <h2 style="color: #8B5CF6;">✅ Confirmación de compra</h2>
                    <p>Tu tarjeta regalo ha sido enviada exitosamente a <strong>${recipientName}</strong> (${recipientEmail})</p>
                    
                    <div style="margin: 30px 0;">
                      <img src="${giftCardImage}" alt="Tarjeta Regalo" style="max-width: 100%; height: auto; border-radius: 15px;"/>
                    </div>
                    
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0;">
                      <h3 style="color: #166534; margin-top: 0;">Detalles del regalo</h3>
                      <p style="color: #374151; margin: 5px 0;"><strong>Para:</strong> ${recipientName} (${recipientEmail})</p>
                      <p style="color: #374151; margin: 5px 0;"><strong>Valor:</strong> ${(card.amount_cents / 100).toFixed(2)}€</p>
                      <p style="color: #374151; margin: 5px 0;"><strong>Código:</strong> ${card.code}</p>
                      ${giftMessage ? `<p style="color: #374151; margin: 5px 0;"><strong>Mensaje:</strong> "${giftMessage}"</p>` : ''}
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                      Gracias por elegir The Nook Madrid para tu regalo especial.
                    </p>
                  </div>
                </div>
              `;
              
              await resend.emails.send({
                from: fromEmail,
                to: [purchaserEmail],
                subject: "Confirmación: Tarjeta regalo enviada",
                html: purchaserHtml,
              });
            }
          }

          // Email al administrador
          if (adminEmail) {
            const adminHtml = `
              <div style="font-family: Arial, sans-serif;">
                <h3>🎁 Nueva compra de tarjetas regalo</h3>
                <p><strong>Total:</strong> ${created.length} tarjeta(s)</p>
                <p><strong>Comprador:</strong> ${buyerEmail || "desconocido"}</p>
                
                <h4>Detalles:</h4>
                <ul>
                  ${created.map((c) => `
                    <li>
                      <strong>${(c.amount_cents / 100).toFixed(2)}€</strong> — Código: <code>${c.code}</code><br>
                      ${c.is_gift ? `🎁 <em>Regalo para: ${c.recipient_name} (${c.recipient_email})</em>` : '📝 <em>Compra personal</em>'}
                      ${c.gift_message ? `<br>💌 Mensaje: "${c.gift_message}"` : ''}
                    </li>
                  `).join('')}
                </ul>
              </div>
            `;
            
            await resend.emails.send({
              from: fromEmail,
              to: [adminEmail],
              subject: "Nueva compra de tarjetas regalo",
              html: adminHtml,
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
