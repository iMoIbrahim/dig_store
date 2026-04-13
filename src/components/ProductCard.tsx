import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface ProductCardProps {
  product: Tables<"products">;
}

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <div className="relative h-48 overflow-hidden bg-secondary/50">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        <Badge className="absolute right-3 top-3" variant={product.stock_count > 0 ? "default" : "destructive"}>
          {product.stock_count > 0 ? `${product.stock_count} in stock` : "Out of stock"}
        </Badge>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{product.title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="text-2xl font-bold text-primary">${Number(product.price).toFixed(2)}</span>
        <Link to={`/product/${product.id}`}>
          <Button size="sm" className="gap-2" disabled={product.stock_count <= 0}>
            <ShoppingCart className="h-4 w-4" />
            View
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
