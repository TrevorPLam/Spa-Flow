import { useState } from "react";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
  type Product,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, ShoppingBag, PackagePlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
  name: z.string().min(1, "Name required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  description: z.string().optional(),
  category: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<{ id: number } & ProductForm | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showBulkReorder, setShowBulkReorder] = useState(false);

  const { data: products = [], isLoading } = useListProducts({ query: { queryKey: getListProductsQueryKey() } });
  const productsArray = Array.isArray(products) ? products : [];
  const lowStockProducts = productsArray.filter(p => p.stock <= (p.lowStockThreshold ?? 5));
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
  }

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", price: 0, stock: 0, lowStockThreshold: 5, description: "", category: "" },
  });

  function openNew() {
    form.reset({ name: "", price: 0, stock: 0, lowStockThreshold: 5, description: "", category: "" });
    setEditingProduct(null);
    setShowNew(true);
  }

  function openEdit(p: Product) {
    form.reset({ name: p.name, price: p.price, stock: p.stock, lowStockThreshold: p.lowStockThreshold ?? 5, description: p.description ?? "", category: p.category ?? "" });
    setEditingProduct({ id: p.id, name: p.name, price: p.price, stock: p.stock, lowStockThreshold: p.lowStockThreshold ?? 5 });
    setShowNew(true);
  }

  async function onSubmit(values: ProductForm) {
    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, data: { name: values.name, price: values.price, stock: values.stock, lowStockThreshold: values.lowStockThreshold, description: values.description, category: values.category } }, {
        onSuccess: () => { toast({ title: "Product updated" }); invalidate(); setShowNew(false); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createProduct.mutate({ data: { name: values.name, price: values.price, stock: values.stock, lowStockThreshold: values.lowStockThreshold, description: values.description, category: values.category } }, {
        onSuccess: () => { toast({ title: "Product created" }); invalidate(); setShowNew(false); },
        onError: () => toast({ title: "Failed to create", variant: "destructive" }),
      });
    }
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag size={20} />Products</h1>
            <p className="text-sm text-muted-foreground">{productsArray.length} items in inventory</p>
          </div>
          {isManager && (
            <div className="flex gap-2">
              {lowStockProducts.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setShowBulkReorder(true)} className="gap-2">
                  <PackagePlus size={16} />Bulk Reorder ({lowStockProducts.length})
                </Button>
              )}
              <Button data-testid="button-new-product" size="sm" onClick={openNew} className="gap-2">
                <Plus size={16} />New Product
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : productsArray.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No products yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Name</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Category</th>
                    <th className="text-right px-6 py-3 text-muted-foreground font-medium">Price</th>
                    <th className="text-right px-6 py-3 text-muted-foreground font-medium">Stock</th>
                    {isManager && <th className="px-6 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {productsArray.map(p => (
                    <tr key={p.id} data-testid={`row-product-${p.id}`}>
                      <td className="px-6 py-4 font-medium">{p.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{p.category || "—"}</td>
                      <td className="px-6 py-4 text-right">${p.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant={p.stock === 0 ? "destructive" : p.stock <= (p.lowStockThreshold ?? 5) ? "secondary" : "outline"}>
                          {p.stock}
                        </Badge>
                      </td>
                      {isManager && (
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                              <Pencil size={14} />
                            </Button>
                            <Button
                              data-testid={`button-delete-product-${p.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteProduct.mutate({ id: p.id }, {
                                onSuccess: () => { toast({ title: "Product deleted" }); invalidate(); },
                              })}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input data-testid="input-product-name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Price ($)</FormLabel><FormControl><Input data-testid="input-product-price" type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="stock" render={({ field }) => (
                  <FormItem><FormLabel>Stock</FormLabel><FormControl><Input data-testid="input-product-stock" type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                <FormItem><FormLabel>Low Stock Threshold</FormLabel><FormControl><Input data-testid="input-product-threshold" type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><FormControl><Input data-testid="input-product-category" placeholder="e.g. Beverages" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                  {editingProduct ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkReorder} onOpenChange={setShowBulkReorder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reorder Low Stock Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will add 20 units to each low stock product. Are you sure?
            </p>
            <ul className="text-sm space-y-2 max-h-60 overflow-y-auto">
              {lowStockProducts.map(p => (
                <li key={p.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{p.stock} → {p.stock + 20}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkReorder(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                for (const product of lowStockProducts) {
                  await updateProduct.mutateAsync({
                    id: product.id,
                    data: {
                      name: product.name,
                      price: product.price,
                      stock: product.stock + 20,
                      lowStockThreshold: product.lowStockThreshold,
                      description: product.description ?? undefined,
                      category: product.category ?? undefined,
                    }
                  });
                }
                invalidate();
                setShowBulkReorder(false);
                toast({ title: `Reordered ${lowStockProducts.length} products` });
              }}
              disabled={updateProduct.isPending}
            >
              Confirm Reorder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
