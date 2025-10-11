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
  const fromEmail = "The Nook Madrid <onboarding@resend.dev>";

  // Try to get base64 of template from Supabase Storage bucket 'gift-cards/template.png'
let giftCardTemplateCache: string | null | undefined;

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

async function ensureGiftCardTemplate(client: ReturnType<typeof createClient>): Promise<string | null> {
  if (giftCardTemplateCache !== undefined) {
    return giftCardTemplateCache;
  }
  giftCardTemplateCache = await getGiftCardTemplateBase64(client);
  return giftCardTemplateCache;
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

        const templateBase64 = await ensureGiftCardTemplate(supabaseAdmin);

        const escapeSvgText = (value: string | null | undefined) =>
          (value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&apos;");

        // Generar y guardar tarjeta regalo personalizada
        async function generateGiftCardImage(card: any, purchaseDate: string): Promise<string> {
          try {
            const templateImage = templateBase64 ?? (await ensureGiftCardTemplate(supabaseAdmin));

            if (templateImage) {
              const svgWidth = 1920;
              const svgHeight = 1248;
              const centerX = svgWidth / 2;

              const recipientName =
                card.recipient_name?.trim() ||
                card.purchased_by_name?.trim() ||
                "";
              const showPrice = card.show_price !== false;
              const formattedAmount = showPrice
                ? ` - ${(card.amount_cents / 100).toFixed(2)}€`
                : "";
              const treatmentLabel =
                (card.gift_card_name?.trim() || "Tarjeta regalo") + formattedAmount;

              const svgContent = `
                <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
                  <image href="${templateImage}" x="0" y="0" width="${svgWidth}" height="${svgHeight}" preserveAspectRatio="xMidYMid slice"/>
                  
                  <text x="${centerX}" y="${svgHeight * 0.42}" text-anchor="middle" font-family="\"Source Sans Pro\", Arial, sans-serif" font-size="${svgWidth * 0.04}" font-weight="600" fill="#1f2937">${escapeSvgText(recipientName)}</text>
                  <text x="${centerX}" y="${svgHeight * 0.53}" text-anchor="middle" font-family="\"Source Sans Pro\", Arial, sans-serif" font-size="${svgWidth * 0.032}" font-weight="500" fill="#374151">${escapeSvgText(treatmentLabel)}</text>
                  <text x="${centerX}" y="${svgHeight * 0.64}" text-anchor="middle" font-family="\"Source Sans Pro\", Arial, sans-serif" font-size="${svgWidth * 0.055}" font-weight="700" fill="#111827" letter-spacing="6">${escapeSvgText(card.code)}</text>
                  <text x="${centerX}" y="${svgHeight * 0.72}" text-anchor="middle" font-family="\"Source Sans Pro\", Arial, sans-serif" font-size="${svgWidth * 0.03}" font-weight="500" fill="#1f2937">${escapeSvgText(purchaseDate)}</text>
                </svg>
              `;

              // Guardar en Supabase Storage
              const fileName = `gift-card-${card.code}-${Date.now()}.svg`;
              const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });

              try {
                const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                  .from("gift-cards")
                  .upload(fileName, svgBlob, {
                    contentType: "image/svg+xml",
                    upsert: false,
                  });

                if (uploadError) {
                  console.error("Error uploading gift card image:", uploadError);
                } else {
                  console.log("Gift card image uploaded successfully:", uploadData.path);
                }
              } catch (uploadErr) {
                console.error("Exception uploading gift card image:", uploadErr);
              }

              return `data:image/svg+xml;base64,${btoa(svgContent)}`;
            }

            // Fallback si no se pudo descargar la plantilla
            const fallbackSvg = `
              <svg width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="250" fill="#D4B896"/>
                <text x="200" y="50" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="#8B6B47">
                  TARJETA REGALO
                </text>
                <text x="200" y="120" text-anchor="middle" font-family="monospace" font-size="20" font-weight="bold" fill="#5A4A3A">
                  ${escapeSvgText(card.code)}
                </text>
                <text x="200" y="150" text-anchor="middle" font-family="Arial" font-size="16" fill="#5A4A3A">
                  ${escapeSvgText(purchaseDate)}
                </text>
                <text x="200" y="200" text-anchor="middle" font-family="Arial" font-size="16" fill="#6B5B4F">
                  THE NOOK MADRID
                </text>
              </svg>
            `;
            return `data:image/svg+xml;base64,${btoa(fallbackSvg)}`;
          } catch (error) {
            console.error("Error generating gift card image:", error);
            const errorSvg = `
              <svg width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="250" fill="#FEE2E2"/>
                <text x="200" y="120" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#B91C1C">
                  Error al generar tarjeta
                </text>
                <text x="200" y="160" text-anchor="middle" font-family="Arial" font-size="14" fill="#7F1D1D">
                  Código: ${escapeSvgText(card.code)}
                </text>
              </svg>
            `;
            return `data:image/svg+xml;base64,${btoa(errorSvg)}`;
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

        const { data: clientPackage } = await supabaseAdmin
          .from("client_packages")
          .select("id,voucher_code,total_sessions,used_sessions,notes,client_id,package_id")
          .ilike("notes", `%${session.id}%`)
          .maybeSingle();

        if (clientPackage) {
          results.client_package = clientPackage;
        } else {
          results.client_package_missing = true;
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

        // El webhook dedicado gestionará el envío del email de confirmación tras checkout.session.completed
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
