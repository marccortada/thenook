import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-PERIOD] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { startDate, endDate, periodType, priceInfo } = body;

    if (!startDate || !endDate || !periodType) {
      throw new Error("Missing required fields: startDate, endDate, periodType");
    }

    logStep("Processing purchase", { startDate, endDate, periodType, priceInfo });

    // Calculate price based on period type
    const basePrices = {
      day: 999, // €9.99
      month: 2999, // €29.99
      quarter: 7999, // €79.99
      year: 29999 // €299.99
    };

    const priceCents = basePrices[periodType as keyof typeof basePrices] || 999;

    // Create the period purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from("period_purchases")
      .insert({
        user_id: user.id,
        start_date: startDate,
        end_date: endDate,
        period_type: periodType,
        price_cents: priceCents,
        status: 'completed',
        purchase_details: {
          price_info: priceInfo,
          purchase_timestamp: new Date().toISOString(),
          user_email: user.email
        }
      })
      .select()
      .single();

    if (purchaseError) {
      logStep("Error creating purchase", purchaseError);
      throw new Error(`Failed to create purchase: ${purchaseError.message}`);
    }

    logStep("Purchase created successfully", { purchaseId: purchase.id });

    // Return success response with purchase details
    return new Response(JSON.stringify({
      success: true,
      purchase: {
        id: purchase.id,
        startDate: purchase.start_date,
        endDate: purchase.end_date,
        periodType: purchase.period_type,
        priceCents: purchase.price_cents,
        status: purchase.status,
        createdAt: purchase.created_at
      },
      message: "Periodo comprado exitosamente"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in purchase-period", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});