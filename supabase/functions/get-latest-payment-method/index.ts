import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  booking_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { booking_id } = (await req.json()) as Body;
    if (!booking_id) throw new Error("booking_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, client_id")
      .eq("id", booking_id)
      .maybeSingle();
    if (bookingErr) throw bookingErr;
    if (!booking) throw new Error("Booking not found");

    let paymentMethodId: string | null = null;
    let customerId: string | null = null;

    const { data: intentRow } = await supabase
      .from("booking_payment_intents")
      .select("stripe_payment_method_id, stripe_customer_id, status")
      .eq("booking_id", booking_id)
      .not("stripe_payment_method_id", "is", null)
      .order("updated_at", { ascending: false, nullsLast: true })
      .limit(1)
      .maybeSingle();
    if (intentRow?.stripe_payment_method_id) {
      paymentMethodId = intentRow.stripe_payment_method_id as string;
      customerId = (intentRow as any).stripe_customer_id || null;
    }

    if (!paymentMethodId && booking.client_id) {
      const { data: lastBooking } = await supabase
        .from("bookings")
        .select("stripe_payment_method_id, stripe_customer_id, payment_method_status, updated_at, created_at")
        .eq("client_id", booking.client_id)
        .not("stripe_payment_method_id", "is", null)
        .order("updated_at", { ascending: false, nullsLast: true })
        .order("created_at", { ascending: false, nullsLast: true })
        .limit(1)
        .maybeSingle();
      const ok = (lastBooking as any)?.payment_method_status === "succeeded";
      if (lastBooking?.stripe_payment_method_id && ok) {
        paymentMethodId = lastBooking.stripe_payment_method_id as string;
        customerId = (lastBooking as any).stripe_customer_id || null;
      }
    }

    if (paymentMethodId) {
      await supabase
        .from("bookings")
        .update({
          stripe_payment_method_id: paymentMethodId,
          stripe_customer_id: customerId || null,
          payment_method_status: "succeeded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking_id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        payment_method_id: paymentMethodId,
        customer_id: customerId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || "error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
