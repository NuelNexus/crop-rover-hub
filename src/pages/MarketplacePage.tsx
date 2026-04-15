import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useProducts, useAddProduct, useDeleteProduct } from "@/hooks/useMarketplace";
import { usePlaceOrder, useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingCart, Package, Star, Plus, Trash2, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const MarketplacePage = () => {
  const { user } = useAuth();
  const { data: products, isLoading } = useProducts();
  const { data: orders } = useOrders();
  const addProduct = useAddProduct();
  const deleteProduct = useDeleteProduct();
  const placeOrder = usePlaceOrder();
  const [showAdd, setShowAdd] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [form, setForm] = useState({ name: "", price: "", price_unit: "ton", seller: "", stock_status: "In Stock", category: "Produce", description: "", rating: 0 });

  const handleAdd = () => {
    if (!form.name.trim() || !form.price || !form.seller.trim()) return;
    addProduct.mutate({ ...form, price: Number(form.price), rating: form.rating || null });
    setForm({ name: "", price: "", price_unit: "ton", seller: "", stock_status: "In Stock", category: "Produce", description: "", rating: 0 });
    setShowAdd(false);
  };

  const addToCart = (product: any) => {
    const existing = cart.find((c) => c.id === product.id);
    if (existing) {
      setCart(cart.map((c) => (c.id === product.id ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      setCart([...cart, { id: product.id, name: product.name, price: product.price, qty: 1 }]);
    }
    toast.success(`Added ${product.name} to cart`);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((c) => c.id !== id));
  };

  const checkout = () => {
    cart.forEach((item) => {
      placeOrder.mutate({
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        total_price: item.price * item.qty,
      });
    });
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (isLoading) return <AppLayout><div className="animate-pulse h-96" /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Marketplace</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowOrders(!showOrders)} className="flex items-center gap-1 bg-secondary text-foreground px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary/80">
              <CheckCircle className="w-4 h-4" /> Orders ({orders?.length || 0})
            </button>
            {cart.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-2 rounded-xl text-sm font-medium">
                  <ShoppingCart className="w-4 h-4" /> {cart.length} · ${cartTotal.toFixed(2)}
                </span>
                <button onClick={checkout} disabled={placeOrder.isPending} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
                  {placeOrder.isPending ? "Processing..." : "Checkout"}
                </button>
              </div>
            )}
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> List Product
            </button>
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="stat-card">
            <h3 className="font-semibold mb-3">Shopping Cart</h3>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price} × {item.qty} = ${(item.price * item.qty).toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders */}
        {showOrders && orders && orders.length > 0 && (
          <div className="stat-card">
            <h3 className="font-semibold mb-3">Your Orders</h3>
            <div className="space-y-2">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{order.product_name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {order.quantity} · Total: ${order.total_price}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${order.status === "pending" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <div key={l.id} className="stat-card hover:shadow-md transition-shadow">
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
                <button
                  onClick={() => addToCart(l)}
                  disabled={l.stock_status === "Out of Stock"}
                  className="flex-1 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Add to Cart
                </button>
                {l.user_id === user?.id && (
                  <button onClick={() => deleteProduct.mutate(l.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default MarketplacePage;
