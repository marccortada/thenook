import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types for incoming request
interface GiftCardItemReq { 
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
}
interface PackageVoucherItemReq {
  package_id: string;
  quantity?: number;
  purchased_by_name?: string;
  purchased_by_email?: string;
  is_gift?: boolean;
  recipient_name?: string;
  recipient_email?: string;
  gift_message?: string;
}
interface PackageVoucherReq {
  items: PackageVoucherItemReq[];
  purchaser_name?: string;
  purchaser_email?: string;
  purchaser_phone?: string;
  is_gift?: boolean;
  recipient_name?: string;
  recipient_email?: string;
  gift_message?: string;
  notes?: string;
  total_cents?: number;
}
interface BookingPaymentReq { booking_id: string }

interface CreateCheckoutBody {
  intent: "gift_cards" | "package_voucher" | "booking_payment";
  gift_cards?: { items: GiftCardItemReq[]; total_cents?: number };
  package_voucher?: PackageVoucherReq;
  booking_payment?: BookingPaymentReq;
  currency?: string; // default eur
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Falta STRIPE_SECRET_KEY en Supabase Secrets");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const origin = req.headers.get("origin") || "https://example.com";
    const body = (await req.json()) as CreateCheckoutBody;
    const currency = (body.currency || "eur").toLowerCase();

    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let metadata: Record<string, string> = {};
    let customerEmail: string | undefined;

    if (body.intent === "gift_cards") {
      const items = body.gift_cards?.items || [];
      console.log("🎁 Gift cards intent - Items recibidos:", JSON.stringify(items, null, 2));
      if (!items.length) throw new Error("Sin tarjetas en la petición");
      
      // Validar datos del comprador
      console.log("🔍 Validando comprador para cada item...");
      for (const it of items) {
        console.log(`  - Item: name=${it.purchased_by_name}, email=${it.purchased_by_email}`);
      }
      const hasValidBuyer = items.every(it => it.purchased_by_name?.trim() && it.purchased_by_email?.trim());
      console.log("✅ hasValidBuyer:", hasValidBuyer);
      if (!hasValidBuyer) {
        console.error("❌ Validación falló - Datos del comprador requeridos");
        throw new Error("Datos del comprador requeridos");
      }
      
      // Validar datos del beneficiario si es regalo
      const hasGifts = items.some(it => it.is_gift);
      if (hasGifts) {
        const hasValidRecipient = items.every(it => !it.is_gift || (it.recipient_name?.trim()));
        if (!hasValidRecipient) throw new Error("Datos del beneficiario requeridos");
      }

      if (!customerEmail) {
        const purchaserEmail = items.find((it) => it.purchased_by_email?.trim())?.purchased_by_email?.trim();
        if (purchaserEmail) {
          customerEmail = purchaserEmail.toLowerCase();
        }
      }
      
      // Construir line items
      for (const it of items) {
        if (!it.amount_cents || it.amount_cents <= 0) throw new Error("Importe inválido");
        const productName = it.name || "Tarjeta Regalo The Nook Madrid";
        line_items.push({
          price_data: {
            currency,
            product_data: { name: productName },
            unit_amount: it.amount_cents,
          },
          quantity: it.quantity ?? 1,
        });
      }
      metadata.intent = "gift_cards";
      metadata.gc_payload = JSON.stringify({ items });
      metadata.gc_skip_verify_email = "true";
    }

    if (body.intent === "package_voucher") {
      const pv = body.package_voucher;
      const items = pv?.items || [];
      if (!items.length) throw new Error("No se han seleccionado bonos");

      const packageIds = Array.from(new Set(items.map((it) => it.package_id).filter(Boolean)));
      if (!packageIds.length) throw new Error("Faltan identificadores de bonos");

      const { data: packagesData, error: packagesError } = await supabaseAdmin
        .from("packages")
        .select("id,name,price_cents,sessions_count,active")
        .in("id", packageIds);
      if (packagesError) throw packagesError;

      const packageMap = new Map<string, any>();
      for (const pkg of packagesData || []) {
        packageMap.set(pkg.id, pkg);
      }

      for (const item of items) {
        const pkg = item.package_id ? packageMap.get(item.package_id) : null;
        if (!pkg || !pkg.active) throw new Error("Paquete no disponible");
        const quantity = Math.max(1, item.quantity ?? 1);
        line_items.push({
          price_data: {
            currency,
            product_data: { name: `Bono ${pkg.name}` },
            unit_amount: pkg.price_cents,
          },
          quantity,
        });
      }

      const purchaserEmail =
        pv.purchaser_email?.trim().toLowerCase() ||
        items.find((it) => it.purchased_by_email?.trim())?.purchased_by_email?.trim().toLowerCase();
      if (purchaserEmail) customerEmail = purchaserEmail;

      metadata.intent = "package_voucher";
      metadata.pv_payload = JSON.stringify({
        items: items.map((it) => ({
          package_id: it.package_id,
          quantity: it.quantity ?? 1,
          is_gift: it.is_gift ?? pv?.is_gift ?? false,
          recipient_name: it.recipient_name,
          recipient_email: it.recipient_email,
          gift_message: it.gift_message,
        })),
        purchaser_name: pv.purchaser_name,
        purchaser_email: pv.purchaser_email,
        purchaser_phone: pv.purchaser_phone,
        is_gift: pv.is_gift ?? items.some((it) => it.is_gift),
        recipient_name: pv.recipient_name,
        recipient_email: pv.recipient_email,
        gift_message: pv.gift_message,
        notes: pv.notes,
      });
    }

    if (body.intent === "booking_payment") {
      const bp = body.booking_payment;
      if (!bp?.booking_id) throw new Error("Falta booking_id");
      const { data: bkg, error } = await supabaseAdmin
        .from("bookings")
        .select("id,total_price_cents,status")
        .eq("id", bp.booking_id)
        .single();
      if (error || !bkg) throw new Error("Reserva no encontrada");

      line_items.push({
        price_data: {
          currency,
          product_data: { name: `Pago de reserva` },
          unit_amount: bkg.total_price_cents,
        },
        quantity: 1,
      });
      metadata.intent = "booking_payment";
      metadata.bp_payload = JSON.stringify(bp);
    }

    if (!line_items.length) throw new Error("No se han generado artículos para el pago");

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items,
      mode: "payment",
      metadata,
      payment_intent_data: {
        metadata,
      },
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const isEmbedded = metadata.intent === "gift_cards";
    if (isEmbedded) {
      sessionParams.ui_mode = "embedded";
      sessionParams.return_url = `${origin}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      sessionParams.success_url = `${origin}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`;
      sessionParams.cancel_url = origin;
    }

    const session = await stripe.checkout.sessions.create(sessionParams).catch((err) => {
      if (err.code === 'amount_too_small') {
        throw new Error('El monto mínimo para pagos con Stripe es €0.50. Por favor aumenta el valor de tu compra.');
      }
      throw err;
    });

    return new Response(JSON.stringify({ 
      client_secret: session.client_secret ?? null,
      session_id: session.id,
      url: session.url ?? null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[create-checkout] error:", err);
    return new Response(JSON.stringify({ error: err.message || "Error interno" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
