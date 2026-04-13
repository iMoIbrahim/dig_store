import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const nowpaymentsApiKey = Deno.env.get("NOWPAYMENTS_API_KEY");

    if (!nowpaymentsApiKey) {
      return new Response(JSON.stringify({ error: "NOWPayments API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);

    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check product
    const { data: product, error: productError } = await supabaseClient
      .from("products").select("*").eq("id", product_id).eq("active", true).single();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (product.stock_count <= 0) {
      return new Response(JSON.stringify({ error: "Out of stock" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create order first
    const { data: order, error: orderError } = await supabaseClient
      .from("orders").insert({
        user_id: user.id,
        product_id: product.id,
        price_amount: product.price,
        payment_status: "pending",
      }).select().single();

    if (orderError) {
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create NOWPayments invoice
    const nowRes = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": nowpaymentsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: product.price,
        price_currency: "usd",
        pay_currency: "usdttrc20",
        order_id: order.id,
        order_description: product.title,
        ipn_callback_url: `${supabaseUrl}/functions/v1/nowpayments-webhook`,
        success_url: `${req.headers.get("origin") || supabaseUrl}/success/${order.id}`,
        cancel_url: `${req.headers.get("origin") || supabaseUrl}/dashboard`,
      }),
    });

    const nowData = await nowRes.json();

    if (!nowRes.ok) {
      console.error("NOWPayments error:", nowData);
      return new Response(JSON.stringify({ error: "Payment creation failed", details: nowData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order with payment info
    await supabaseClient.from("orders").update({
      payment_id: String(nowData.id),
      pay_address: nowData.pay_address || null,
      pay_amount: nowData.pay_amount || null,
      pay_currency: nowData.pay_currency || "usdttrc20",
      nowpayments_data: nowData,
    }).eq("id", order.id);

    return new Response(JSON.stringify({
      order_id: order.id,
      invoice_url: nowData.invoice_url,
      pay_address: nowData.pay_address,
      pay_amount: nowData.pay_amount,
      pay_currency: nowData.pay_currency,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
