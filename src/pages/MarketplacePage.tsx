import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useProducts, useAddProduct, useDeleteProduct } from "@/hooks/useMarketplace";
import { ShoppingCart, Package, Star, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const MarketplacePage = () => {
  const { data: products, isLoading } = useProducts();
  const addProduct = useAddProduct();
  const deleteProduct = useDeleteProduct();
  const [showAdd, setShowAdd] = useState(false);
  const [cart, setCart] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", price: "", price_unit: "ton", seller: "", stock_status: "In Stock", category: "Produce", description: "", rating: 0 });

  const handleAdd = () => {
    if (!form.name.trim() || !form.price || !form.seller.trim()) return;
    addProduct.mutate({ ...form, price: Number(form.price), rating: form.rating || null });
    setForm({ name: "", price: "", price_unit: "ton", seller: "", stock_status: "In Stock", category: "Produce", description: "", rating: 0 });
    setShowAdd(false);
  };

  const toggleCart = (id: string) => {
    if (cart.includes(id)) {
      setCart(cart.filter(c => c !== id));
      toast.info("Removed from cart");
    } else {
      setCart([...cart, id]);
      toast.success("Added to cart");
    }
  };

  if (isLoading) return <AppLayout><div className="animate-pulse h-96" /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Marketplace</h1>
          <div className="flex gap-2">
            {cart.length > 0 && (
              <span className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-2 rounded-xl text-sm font-medium">
                <ShoppingCart className="w-4 h-4" /> {cart.length} items
              </span>
            )}
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> List Product
            </button>
          </div>
        </div>

        {showAdd && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">List New Product</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <div className="flex gap-2">
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Price" className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                <select value={form.price_unit} onChange={e => setForm({ ...form, price_unit: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                  <option value="ton">/ton</option><option value="bag">/bag</option><option value="kit">/kit</option><option value="pcs">/pcs</option>
                </select>
              </div>
              <input value={form.seller} onChange={e => setForm({ ...form, seller: e.target.value })} placeholder="Seller name" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <select value={form.stock_status} onChange={e => setForm({ ...form, stock_status: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                <option>In Stock</option><option>Limited</option><option>Out of Stock</option>
              </select>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                <option>Produce</option><option>Seeds</option><option>Supplies</option><option>Equipment</option>
              </select>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
            <button onClick={handleAdd} disabled={addProduct.isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium hover:opacity-90">
              {addProduct.isPending ? "Listing..." : "List Product"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(products || []).map((l) => (
            <div key={l.id} className={`stat-card hover:shadow-md transition-shadow ${cart.includes(l.id) ? "ring-2 ring-primary" : ""}`}>
              <div className="w-full h-28 bg-secondary rounded-xl mb-3 flex items-center justify-center">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-sm">{l.name}</h3>
              <p className="font-display text-lg font-bold text-primary mt-1">${l.price}/{l.price_unit}</p>
              <p className="text-xs text-muted-foreground mt-1">{l.seller}</p>
              {l.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.description}</p>}
              <div className="flex items-center justify-between mt-2">
                <span className="flex items-center gap-1 text-xs"><Star className="w-3 h-3 text-warning fill-warning" /> {l.rating || "N/A"}</span>
                <span className={`text-xs font-medium ${l.stock_status === "Limited" ? "text-warning" : l.stock_status === "Out of Stock" ? "text-destructive" : "text-success"}`}>{l.stock_status}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => toggleCart(l.id)} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${cart.includes(l.id) ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
                  {cart.includes(l.id) ? "In Cart ✓" : "Add to Cart"}
                </button>
                <button onClick={() => deleteProduct.mutate(l.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default MarketplacePage;
