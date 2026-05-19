import { useState } from "react";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
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
import { Plus, Pencil, Trash2, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
  name: z.string().min(1, "Name required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  stock: z.coerce.number().int().min(0),
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

  const { data: products = [], isLoading } = useListProducts({ query: { queryKey: getListProductsQueryKey() } });
  const productsArray = Array.isArray(products) ? products : [];
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
  }

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", price: 0, stock: 0, description: "", category: "" },
  });

  function openNew() {
    form.reset({ name: "", price: 0, stock: 0, description: "", category: "" });
    setEditingProduct(null);
    setShowNew(true);
  }

  function openEdit(p: typeof products[0]) {
    form.reset({ name: p.name, price: p.price, stock: p.stock, description: p.description ?? "", category: p.category ?? "" });
    setEditingProduct({ id: p.id, name: p.name, price: p.price, stock: p.stock });
    setShowNew(true);
  }

  async function onSubmit(values: ProductForm) {
    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, data: { name: values.name, price: values.price, stock: values.stock, description: values.description, category: values.category } }, {
        onSuccess: () => { toast({ title: "Product updated" }); invalidate(); setShowNew(false); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createProduct.mutate({ data: { name: values.name, price: values.price, stock: values.stock, description: values.description, category: values.category } }, {
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
            <Button data-testid="button-new-product" size="sm" onClick={openNew} className="gap-2">
              <Plus size={16} />New Product
            </Button>
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
                        <Badge variant={p.stock === 0 ? "destructive" : p.stock < 5 ? "secondary" : "outline"}>
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
    </Layout>
  );
}
