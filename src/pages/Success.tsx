import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Success = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();

  const { data: order } = useQuery({
    queryKey: ["order-success", orderId],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, products(title)").eq("id", orderId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
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
        <div className="mb-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h1 className="text-3xl font-bold">Payment Successful!</h1>
          <p className="mt-2 text-muted-foreground">Your account has been delivered</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {(order.products as any)?.title || "Digital Account"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.delivered_account_email && (
              <div className="rounded-lg bg-secondary p-4">
                <p className="mb-1 text-xs text-muted-foreground">Account Email</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono">{order.delivered_account_email}</p>
                  <Button size="icon" variant="ghost" onClick={() => copy(order.delivered_account_email!, "Email")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {order.delivered_account_password && (
              <div className="rounded-lg bg-secondary p-4">
                <p className="mb-1 text-xs text-muted-foreground">Account Password</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono">{order.delivered_account_password}</p>
                  <Button size="icon" variant="ghost" onClick={() => copy(order.delivered_account_password!, "Password")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {!order.delivered_account_email && (
              <p className="text-center text-muted-foreground">Account details are being prepared...</p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link to="/dashboard">
            <Button className="gap-2">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Success;
