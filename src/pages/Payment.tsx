import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const Payment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: order, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, products(title)").eq("id", orderId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (order?.payment_status === "delivered") {
      navigate(`/success/${order.id}`);
    }
  }, [order?.payment_status, order?.id, navigate]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Address copied to clipboard" });
  };

  const statusIcon = {
    pending: <Clock className="h-5 w-5 text-muted-foreground" />,
    confirming: <Clock className="h-5 w-5 text-accent-foreground animate-spin" />,
    paid: <CheckCircle className="h-5 w-5 text-primary" />,
    delivered: <CheckCircle className="h-5 w-5 text-primary" />,
    failed: <AlertCircle className="h-5 w-5 text-destructive" />,
  };

  if (!order) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Complete Payment</CardTitle>
            <p className="text-sm text-muted-foreground">
              Send the exact amount to the address below
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center gap-2">
              {statusIcon[order.payment_status as keyof typeof statusIcon] || statusIcon.pending}
              <Badge variant="outline" className="text-sm capitalize">{order.payment_status}</Badge>
            </div>

            {order.pay_address && (
              <div className="space-y-4">
                <div className="rounded-lg bg-secondary p-4">
                  <p className="mb-1 text-xs text-muted-foreground">Send Amount</p>
                  <p className="text-2xl font-bold text-primary">
                    {order.pay_amount} {order.pay_currency?.toUpperCase()}
                  </p>
                </div>

                <div className="rounded-lg bg-secondary p-4">
                  <p className="mb-1 text-xs text-muted-foreground">Payment Address</p>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 break-all font-mono text-sm">{order.pay_address}</p>
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(order.pay_address!)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Payment is automatically detected. This page refreshes every 10 seconds.
                </p>
              </div>
            )}

            {!order.pay_address && order.payment_status === "pending" && (
              <p className="text-center text-muted-foreground">
                Generating payment details...
              </p>
            )}

            <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
              View in Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
