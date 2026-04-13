import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (req) => {
  try {
    const ipnSecret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
    if (!ipnSecret) {
      console.error("IPN secret not configured");
      return new Response("Server error", { status: 500 });
    }

    const body = await req.text();
    const data = JSON.parse(body);

    // Verify HMAC signature
    const receivedSig = req.headers.get("x-nowpayments-sig");
    if (!receivedSig) {
      return new Response("Missing signature", { status: 400 });
    }

    // Sort keys and create HMAC
    const sortedData = Object.keys(data).sort().reduce((acc: any, key: string) => {
      acc[key] = data[key];
      return acc;
    }, {});

    const hmac = createHmac("sha512", ipnSecret);
    hmac.update(JSON.stringify(sortedData));
    const expectedSig = hmac.digest("hex");

    if (receivedSig !== expectedSig) {
      console.error("Invalid signature");
      return new Response("Invalid signature", { status: 403 });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const orderId = data.order_id;
    const paymentStatus = data.payment_status;

    console.log(`Webhook: order=${orderId}, status=${paymentStatus}`);

    if (!orderId) {
      return new Response("Missing order_id", { status: 400 });
    }

    // Update order with payment data
    await supabaseClient.from("orders").update({
      payment_status: paymentStatus === "finished" ? "paid" : paymentStatus,
      pay_address: data.pay_address,
      pay_amount: data.pay_amount,
      pay_currency: data.pay_currency,
      nowpayments_data: data,
    }).eq("id", orderId);

    // Auto-deliver if payment finished
    if (paymentStatus === "finished") {
      const { data: order } = await supabaseClient
        .from("orders").select("*").eq("id", orderId).single();

      if (order && order.payment_status !== "delivered") {
        // Find an unsold account for this product (with row locking via update)
        const { data: account } = await supabaseClient
          .from("accounts")
          .select("*")
          .eq("product_id", order.product_id)
          .eq("sold", false)
          .limit(1)
          .single();

        if (account) {
          // Mark account as sold
          await supabaseClient.from("accounts").update({
            sold: true,
            assigned_to: order.user_id,
            order_id: orderId,
          }).eq("id", account.id).eq("sold", false); // Prevent race condition

          // Deliver to order
          await supabaseClient.from("orders").update({
            payment_status: "delivered",
            delivered_account_email: account.account_email,
            delivered_account_password: account.account_password,
          }).eq("id", orderId);

          // Decrement stock
          const { data: product } = await supabaseClient
            .from("products").select("stock_count").eq("id", order.product_id).single();

          if (product) {
            await supabaseClient.from("products").update({
              stock_count: Math.max(0, product.stock_count - 1),
            }).eq("id", order.product_id);
          }

          console.log(`Delivered account ${account.id} to order ${orderId}`);
        } else {
          console.error(`No available accounts for product ${order.product_id}`);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Server error", { status: 500 });
  }
});
