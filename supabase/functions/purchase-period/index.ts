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

    // Create Supabase client using the service role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Also create anon client for user authentication
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
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

    // Calculate actual revenue from existing bookings for the selected period
    const { data: bookingsData, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select("total_price_cents, booking_datetime")
      .gte("booking_datetime", startDate)
      .lte("booking_datetime", endDate)
      .eq("payment_status", "completed");

    if (bookingsError) {
      logStep("Error fetching bookings data", bookingsError);
    }

    // Calculate total revenue from bookings in the period
    const totalRevenueCents = (bookingsData || []).reduce((sum, booking) => sum + (booking.total_price_cents || 0), 0);
    const bookingCount = (bookingsData || []).length;
    
    // Calculate days in period
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const daysInPeriod = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate dynamic price based on actual data
    let calculatedPriceCents;
    if (totalRevenueCents > 0) {
      // Use a percentage of the actual revenue as the price
      calculatedPriceCents = Math.round(totalRevenueCents * 0.05); // 5% of total revenue
    } else {
      // Fallback to base pricing per day
      const pricePerDay = 199; // €1.99 per day
      calculatedPriceCents = daysInPeriod * pricePerDay;
    }

    // Minimum price of €4.99
    const priceCents = Math.max(calculatedPriceCents, 499);

    logStep("Price calculation", { 
      daysInPeriod, 
      totalRevenueCents, 
      bookingCount, 
      calculatedPriceCents, 
      finalPriceCents: priceCents 
    });

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