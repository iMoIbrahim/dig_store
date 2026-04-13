import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Package, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, products(title)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    paid: "bg-blue-500/20 text-blue-400",
    delivered: "bg-emerald-500/20 text-emerald-400",
    failed: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">View your orders and purchased accounts</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{(order.products as any)?.title || "Product"}</CardTitle>
                  </div>
                  <Badge className={statusColor[order.payment_status] || ""}>
                    {order.payment_status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>${Number(order.price_amount || 0).toFixed(2)}</span>
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>

                  {order.payment_status === "delivered" && order.delivered_account_email && (
                    <div className="mt-4 space-y-2 rounded-lg bg-secondary p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Email:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{order.delivered_account_email}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(order.delivered_account_email!)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {order.delivered_account_password && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Password:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{order.delivered_account_password}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(order.delivered_account_password!)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {order.payment_status === "pending" && (
                    <Link to={`/payment/${order.id}`}>
                      <Button variant="outline" size="sm" className="mt-4">
                        Complete Payment
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold">No orders yet</h3>
            <p className="text-muted-foreground">Browse our products to get started</p>
            <Link to="/">
              <Button className="mt-4">Browse Products</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
