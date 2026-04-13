import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Package, ShoppingCart, ArrowLeft, CheckCircle } from "lucide-react";
import { useState } from "react";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [buying, setBuying] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleBuy = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { product_id: product!.id },
      });
      if (error) throw error;
      navigate(`/payment/${data.order_id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create payment", variant: "destructive" });
    } finally {
      setBuying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="h-96 animate-pulse rounded-lg bg-card" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Product not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Button>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary/50">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <Badge className="mb-4 w-fit" variant={product.stock_count > 0 ? "default" : "destructive"}>
              {product.stock_count > 0 ? `${product.stock_count} in stock` : "Out of stock"}
            </Badge>
            <h1 className="mb-4 text-3xl font-bold">{product.title}</h1>
            <p className="mb-6 text-muted-foreground leading-relaxed">{product.description}</p>

            <Card className="mb-6">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-3xl font-bold text-primary">${Number(product.price).toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">USDT (TRC20/BEP20)</span>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button className="w-full gap-2" size="lg" onClick={handleBuy} disabled={product.stock_count <= 0 || buying}>
                <ShoppingCart className="h-5 w-5" />
                {buying ? "Processing..." : "Buy Now"}
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                Instant delivery after payment confirmation
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
