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
            name?: string;
            purchased_by_name?: string;
            purchased_by_email?: string;
            is_gift?: boolean;
            recipient_name?: string;
            recipient_email?: string;
            gift_message?: string;
            show_price?: boolean;
            send_to_buyer?: boolean;
            show_buyer_data?: boolean;
          }[] 
        };
        
        const created: Array<{ 
          id: string; 
          code: string; 
          amount_cents: number;
          gift_card_name: string;
          purchased_by_name?: string;
          purchased_by_email?: string;
          is_gift?: boolean;
          recipient_name?: string;
          recipient_email?: string;
          gift_message?: string;
          show_price?: boolean;
          send_to_buyer?: boolean;
          show_buyer_data?: boolean;
        }> = [];
        
        for (const it of payload.items) {
          const qty = it.quantity ?? 1;
          
          
          // Usar el nombre del item si está disponible, si no buscar por amount_cents
          let giftCardName = it.name;
          if (!giftCardName) {
            const { data: giftCardOption, error: optionError } = await supabaseAdmin
              .from("gift_card_options")
              .select("name")
              .eq("amount_cents", it.amount_cents)
              .eq("is_active", true)
              .maybeSingle();
            
            giftCardName = giftCardOption?.name || `Tarjeta ${(it.amount_cents / 100).toFixed(2)}€`;
          }
          
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
              gift_card_name: giftCardName,
              purchased_by_name: it.purchased_by_name,
              purchased_by_email: it.purchased_by_email,
              is_gift: it.is_gift,
              recipient_name: it.recipient_name,
              recipient_email: it.recipient_email,
              gift_message: it.gift_message,
              show_price: it.show_price ?? true,
              send_to_buyer: it.send_to_buyer ?? true,
              show_buyer_data: it.show_buyer_data ?? true
            });
          }
        }
        results.gift_cards = created;

        // Generar y guardar tarjeta regalo personalizada
        async function generateGiftCardImage(card: any, purchaseDate: string): Promise<string> {
          try {
            // Crear imagen SVG con el diseño de la tarjeta
            const svgContent = `
              <svg width="670" height="473" viewBox="0 0 670 473" xmlns="http://www.w3.org/2000/svg">
                <!-- Background base color matching the template -->
                <rect width="670" height="473" fill="#D4B896"/>
                
                <!-- Decorative mandala elements -->
                <g opacity="0.6" fill="#C4A776">
                  <!-- Left mandala -->
                  <g transform="translate(60, 60)">
                    <circle cx="0" cy="0" r="40" fill="none" stroke="#C4A776" stroke-width="2"/>
                    <circle cx="0" cy="0" r="25" fill="none" stroke="#C4A776" stroke-width="1"/>
                    <path d="M-30,0 L-15,0 M30,0 L15,0 M0,-30 L0,-15 M0,30 L0,15" stroke="#C4A776" stroke-width="2"/>
                    <path d="M-21,-21 L-10,-10 M21,-21 L10,-10 M-21,21 L-10,10 M21,21 L10,10" stroke="#C4A776" stroke-width="1"/>
                  </g>
                  
                  <!-- Right mandala -->
                  <g transform="translate(610, 60)">
                    <circle cx="0" cy="0" r="40" fill="none" stroke="#C4A776" stroke-width="2"/>
                    <circle cx="0" cy="0" r="25" fill="none" stroke="#C4A776" stroke-width="1"/>
                    <path d="M-30,0 L-15,0 M30,0 L15,0 M0,-30 L0,-15 M0,30 L0,15" stroke="#C4A776" stroke-width="2"/>
                    <path d="M-21,-21 L-10,-10 M21,-21 L10,-10 M-21,21 L-10,10 M21,21 L10,10" stroke="#C4A776" stroke-width="1"/>
                  </g>
                </g>
                
                <!-- Main title -->
                <text x="335" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#8B6B47" letter-spacing="4px">
                  TARJETA REGALO
                </text>
                
                <!-- Upper rectangle for code -->
                <rect x="180" y="150" width="310" height="60" rx="8" ry="8" fill="none" stroke="#8B6B47" stroke-width="3" stroke-dasharray="5,5"/>
                <text x="335" y="185" text-anchor="middle" font-family="monospace" font-size="22" font-weight="bold" fill="#5A4A3A">
                  ${card.code}
                </text>
                
                <!-- Lower rectangle for date -->
                <rect x="180" y="230" width="310" height="40" rx="8" ry="8" fill="none" stroke="#8B6B47" stroke-width="3" stroke-dasharray="5,5"/>
                <text x="335" y="255" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#5A4A3A">
                  ${purchaseDate}
                </text>
                
                <!-- Business hours and info -->
                <text x="100" y="330" font-family="Arial, sans-serif" font-size="14" fill="#6B5B4F">
                  Abrimos todos los días
                </text>
                <text x="100" y="350" font-family="Arial, sans-serif" font-size="14" fill="#6B5B4F">
                  Lunes a Domingo 10:00 - 22:00
                </text>
                <text x="100" y="370" font-family="Arial, sans-serif" font-size="14" fill="#6B5B4F">
                  Incluido festivos
                </text>
                <text x="100" y="390" font-family="Arial, sans-serif" font-size="14" fill="#6B5B4F">
                  www.thenookmadrid.com
                </text>
                
                <!-- Contact info -->
                <text x="570" y="330" text-anchor="end" font-family="Arial, sans-serif" font-size="14" fill="#6B5B4F">
                  Reservas
                </text>
                <text x="570" y="350" text-anchor="end" font-family="Arial, sans-serif" font-size="14" fill="#6B5B4F">
                  reservas@thenookmadrid.com
                </text>
                <text x="570" y="370" text-anchor="end" font-family="Arial, sans-serif" font-size="14" fill="#6B5B4F">
                  t. 911 481 474
                </text>
                <text x="570" y="390" text-anchor="end" font-family="Arial, sans-serif" font-size="14" fill="#6B5B4F">
                  W. 622 36 09 22
                </text>
                
                <!-- Address -->
                <text x="335" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#5A4A3A">
                  THE NOOK MADRID | Zurbarán 10 | Príncipe de Vergara 204
                </text>
                
                <!-- Logo placeholder in bottom right -->
                <g transform="translate(550, 410)">
                  <text font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#8B6B47">the</text>
                  <text y="25" font-family="Arial, sans-serif" font-size="24" fill="#8B6B47">nook</text>
                </g>
              </svg>
            `;
            
            // Guardar en Supabase Storage
            const fileName = `gift-card-${card.code}-${Date.now()}.svg`;
            const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
            
            try {
              const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('gift-cards')
                .upload(fileName, svgBlob, {
                  contentType: 'image/svg+xml',
                  upsert: false
                });
              
              if (uploadError) {
                console.error('Error uploading gift card image:', uploadError);
              } else {
                console.log('Gift card image uploaded successfully:', uploadData.path);
              }
            } catch (uploadErr) {
              console.error('Exception uploading gift card image:', uploadErr);
            }
            
            // Retornar imagen como data URL para el email
            return `data:image/svg+xml;base64,${btoa(svgContent)}`;
          } catch (error) {
            console.error('Error generating gift card image:', error);
            // Fallback a imagen simple
            return `data:image/svg+xml;base64,${btoa(`
              <svg width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="250" fill="#D4B896"/>
                <text x="200" y="50" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="#8B6B47">
                  TARJETA REGALO
                </text>
                <text x="200" y="120" text-anchor="middle" font-family="monospace" font-size="20" font-weight="bold" fill="#5A4A3A">
                  ${card.code}
                </text>
                <text x="200" y="150" text-anchor="middle" font-family="Arial" font-size="16" fill="#5A4A3A">
                  ${purchaseDate}
                </text>
                <text x="200" y="200" text-anchor="middle" font-family="Arial" font-size="16" fill="#6B5B4F">
                  THE NOOK MADRID
                </text>
              </svg>
            `)}`;
          }
        }

        // Enviar emails con imagen de tarjeta regalo
        try {
          for (const card of created) {
            // Generar fecha de compra en formato DD/MM/AAAA
            const purchaseDate = new Date().toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            
            // Generar imagen personalizada de la tarjeta regalo
            const giftCardImage = await generateGiftCardImage(card, purchaseDate);

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
                ? `🎁 ¡Has recibido ${card.gift_card_name} de ${purchaserName || 'alguien especial'}!`
                : `Tu ${card.gift_card_name} de The Nook Madrid`;
                
              const recipientHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="text-align: center; padding: 20px;">
                    <h2 style="color: #8B5CF6;">${isGift ? '🎁 ¡Has recibido una tarjeta regalo!' : '✨ Tu tarjeta regalo'}</h2>
                    <h3 style="color: #D4B896; margin: 10px 0;">${card.gift_card_name}</h3>
                    ${isGift ? `<p style="font-size: 18px; color: #666;">De parte de: <strong>${purchaserName || 'Alguien especial'}</strong></p>` : ''}
                    ${giftMessage ? `<div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic; color: #666;">"${giftMessage}"</div>` : ''}
                    
                    <div style="margin: 30px 0;">
                      <img src="${giftCardImage}" alt="${card.gift_card_name}" style="max-width: 100%; height: auto; border-radius: 15px;"/>
                    </div>
                    
                    <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                      <h3 style="color: #1e40af; margin-top: 0;">¿Cómo usar tu tarjeta regalo?</h3>
                      <ol style="text-align: left; color: #374151;">
                        <li>Reserva tu cita llamando al <strong>911 481 474</strong></li>
                        <li>Presenta el código <strong>${card.code}</strong> al llegar</li>
                        <li>¡Disfruta de tu experiencia relajante!</li>
                      </ol>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                      ${card.gift_card_name} con valor de <strong>${(card.amount_cents / 100).toFixed(2)}€</strong><br>
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
                      <strong>${c.gift_card_name}</strong> (${(c.amount_cents / 100).toFixed(2)}€) — Código: <code>${c.code}</code><br>
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
