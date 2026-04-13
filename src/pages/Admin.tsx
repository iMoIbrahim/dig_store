import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, ShoppingCart, Database, Trash2 } from "lucide-react";

const Admin = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Products
  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Orders
  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, products(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Accounts inventory
  const { data: accounts } = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*, products(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Add Product
  const [productForm, setProductForm] = useState({ title: "", description: "", price: "", image_url: "" });
  const [showProductDialog, setShowProductDialog] = useState(false);

  const addProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert({
        title: productForm.title,
        description: productForm.description,
        price: parseFloat(productForm.price),
        image_url: productForm.image_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setProductForm({ title: "", description: "", price: "", image_url: "" });
      setShowProductDialog(false);
      toast({ title: "Product added!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Add Accounts (bulk)
  const [accountForm, setAccountForm] = useState({ product_id: "", accounts_text: "" });
  const [showAccountDialog, setShowAccountDialog] = useState(false);

  const addAccounts = useMutation({
    mutationFn: async () => {
      const lines = accountForm.accounts_text.split("\n").filter((l) => l.trim());
      const accountRows = lines.map((line) => {
        const [email, password] = line.split(":").map((s) => s.trim());
        return { product_id: accountForm.product_id, account_email: email, account_password: password };
      });
      const { error } = await supabase.from("accounts").insert(accountRows);
      if (error) throw error;
      // Update stock count
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock_count: (accounts?.filter((a) => a.product_id === accountForm.product_id && !a.sold).length || 0) + accountRows.length })
        .eq("id", accountForm.product_id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setAccountForm({ product_id: "", accounts_text: "" });
      setShowAccountDialog(false);
      toast({ title: "Accounts added!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Product deleted" });
    },
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Admin Panel</h1>

        <Tabs defaultValue="products">
          <TabsList className="mb-6">
            <TabsTrigger value="products" className="gap-2"><Package className="h-4 w-4" />Products</TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2"><Database className="h-4 w-4" />Inventory</TabsTrigger>
            <TabsTrigger value="orders" className="gap-2"><ShoppingCart className="h-4 w-4" />Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Products</h2>
              <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" />Add Product</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Title</Label><Input value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} /></div>
                    <div><Label>Description</Label><Textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></div>
                    <div><Label>Price (USD)</Label><Input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></div>
                    <div><Label>Image URL (optional)</Label><Input value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} /></div>
                    <Button onClick={() => addProduct.mutate()} disabled={addProduct.isPending} className="w-full">
                      {addProduct.isPending ? "Adding..." : "Add Product"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>${Number(p.price).toFixed(2)}</TableCell>
                    <TableCell>{p.stock_count}</TableCell>
                    <TableCell><Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => deleteProduct.mutate(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="inventory">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Account Inventory</h2>
              <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" />Add Accounts</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Accounts to Inventory</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Product</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={accountForm.product_id}
                        onChange={(e) => setAccountForm({ ...accountForm, product_id: e.target.value })}
                      >
                        <option value="">Select product...</option>
                        {products?.map((p) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Accounts (email:password, one per line)</Label>
                      <Textarea rows={8} placeholder={"user@example.com:password123\nuser2@example.com:pass456"} value={accountForm.accounts_text} onChange={(e) => setAccountForm({ ...accountForm, accounts_text: e.target.value })} />
                    </div>
                    <Button onClick={() => addAccounts.mutate()} disabled={addAccounts.isPending || !accountForm.product_id} className="w-full">
                      {addAccounts.isPending ? "Adding..." : "Add Accounts"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts?.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{(a.products as any)?.title || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{a.account_email}</TableCell>
                    <TableCell><Badge variant={a.sold ? "secondary" : "default"}>{a.sold ? "Sold" : "Available"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="orders">
            <h2 className="mb-4 text-xl font-semibold">All Orders</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{(o.products as any)?.title || "—"}</TableCell>
                    <TableCell>${Number(o.price_amount || 0).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{o.payment_status}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{o.payment_id || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
