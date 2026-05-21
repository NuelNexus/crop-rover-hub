import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useProducts, useAddProduct, useDeleteProduct } from "@/hooks/useMarketplace";
import { usePlaceOrder, useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingCart, Package, Plus, Trash2, X, CheckCircle, Sprout } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SakuraOverlay from "@/components/marketplace/SakuraOverlay";

const TOP_TABS = ["All", "Featured", "In Stock", "Limited"] as const;
type TopTab = (typeof TOP_TABS)[number];

const CATEGORY_GROUPS: { title: string; items: string[] }[] = [
  { title: "Categories", items: ["Produce", "Seeds", "Supplies", "Equipment"] },
  { title: "Availability", items: ["In Stock", "Limited", "Out of Stock"] },
];

const colorFor = (name: string) => {
  const palette = ["#76993E", "#4A5E23", "#D97706", "#0F766E", "#7C3AED", "#B91C1C", "#0369A1", "#9333EA"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

const MarketplacePage = () => {
  const { user } = useAuth();
  const { data: products, isLoading } = useProducts();
  const { data: orders } = useOrders();
  const addProduct = useAddProduct();
  const deleteProduct = useDeleteProduct();
  const placeOrder = usePlaceOrder();

  const [showAdd, setShowAdd] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [topTab, setTopTab] = useState<TopTab>("All");
  const [filter, setFilter] = useState<string | null>(null);
  const [details, setDetails] = useState<any | null>(null);
  const [sakuraActive, setSakuraActive] = useState(false);
  const [sakuraKey, setSakuraKey] = useState(0);
  const [sakuraTargetId, setSakuraTargetId] = useState<string | null>(null);

  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [form, setForm] = useState({
    name: "", price: "", price_unit: "ton", seller: "", stock_status: "In Stock",
    category: "Produce", description: "", rating: 0, image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const filtered = useMemo(() => {
    let list = products || [];
    if (topTab === "Featured") list = list.filter((p) => (p.rating || 0) >= 4);
    if (topTab === "In Stock") list = list.filter((p) => p.stock_status === "In Stock");
    if (topTab === "Limited") list = list.filter((p) => p.stock_status === "Limited");
    if (filter) {
      list = list.filter((p) => p.category === filter || p.stock_status === filter);
    }
    return list;
  }, [products, topTab, filter]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.price || !form.seller.trim()) return;

    let imageUrl = form.image_url?.trim() || null;

    if (imageFile) {
      if (!imageFile.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      if (imageFile.size > 5 * 1024 * 1024) {
        toast.error("Image too large (max 5MB)");
        return;
      }

      const path = `${user?.id || "public"}/${Date.now()}-${imageFile.name}`;
      const { error: upErr } = await supabase.storage.from("marketplace").upload(path, imageFile, { upsert: false });
      if (upErr) {
        if (upErr.message?.toLowerCase().includes("bucket not found")) {
          toast.error("Storage bucket 'marketplace' not found. Create it in Supabase Storage or run migrations.");
        } else {
          toast.error(upErr.message || "Image upload failed");
        }
        return;
      }
      const { data: pub } = supabase.storage.from("marketplace").getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }

    try {
      await addProduct.mutateAsync({
        ...form,
        price: Number(form.price),
        rating: form.rating || null,
        image_url: imageUrl,
      });
    } catch {
      return;
    }

    setForm({ name: "", price: "", price_unit: "ton", seller: "", stock_status: "In Stock", category: "Produce", description: "", rating: 0, image_url: "" });
    setImageFile(null);
    setShowAdd(false);
    setSakuraKey((k) => k + 1);
    setSakuraTargetId(null);
    setSakuraActive(true);
  };

  const addToCart = (product: any) => {
    const existing = cart.find((c) => c.id === product.id);
    if (existing) setCart(cart.map((c) => (c.id === product.id ? { ...c, qty: c.qty + 1 } : c)));
    else setCart([...cart, { id: product.id, name: product.name, price: Number(product.price), qty: 1 }]);
    toast.success(`Added ${product.name} to cart`);
    setSakuraKey((k) => k + 1);
    setSakuraTargetId(product.id);
    setSakuraActive(true);
  };

  const removeFromCart = (id: string) => setCart(cart.filter((c) => c.id !== id));

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
    setShowCart(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((n, item) => n + item.qty, 0);

  return (
    <AppLayout>
      {/* Header strip */}
      <div className="bg-card border border-border rounded-2xl mb-6 sticky top-2 z-20">
        <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
          <Sprout className="w-7 h-7 text-primary" />
          <span className="font-display text-2xl font-extrabold tracking-tight mr-4">Harvest Market</span>

          <nav className="flex items-center gap-1 flex-wrap">
            {TOP_TABS.map((t) => (
              <button
                key={t}
                onClick={() => { setTopTab(t); setFilter(null); }}
                className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide rounded-md transition ${
                  topTab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowOrders(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary"
            >
              <CheckCircle className="w-4 h-4" /> Orders ({orders?.length || 0})
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 rounded-full hover:bg-secondary"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:block w-48 shrink-0">
          <div className="sticky top-24 space-y-6">
            <button
              onClick={() => setFilter(null)}
              className={`block w-full text-left text-sm font-semibold px-2 py-1 rounded ${!filter ? "text-primary" : "hover:text-foreground text-muted-foreground"}`}
            >
              All products
            </button>
            {CATEGORY_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="font-bold text-sm mb-2">{g.title}</p>
                <ul className="space-y-1 pl-2 border-l border-border">
                  {g.items.map((it) => (
                    <li key={it}>
                      <button
                        onClick={() => setFilter(it)}
                        className={`text-sm px-2 py-1 transition ${filter === it ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {it}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Products */}
        <section className="flex-1 min-w-0">
          {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-secondary animate-pulse aspect-square" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No products yet. Click <b>List</b> to add the first one.</p>
              </div>
            ) : (
              <div className="hiq-card-grid">
                {filtered.map((l) => {
                  const accent = colorFor(l.name);
                  const initial = l.name.charAt(0).toUpperCase();
                  const outOfStock = l.stock_status === "Out of Stock";
                  return (
                    <article
                      key={l.id}
                      className="hiq-product-card"
                      style={{ ["--product-card--accent" as any]: accent }}
                    >
                      <span className="hiq-category">{l.category || "Product"}</span>
                      <div className="hiq-thumb" style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}55)` }}>
                        {sakuraActive && sakuraTargetId === l.id && (
                          <SakuraOverlay
                            key={`sakura-${sakuraKey}`}
                            active={sakuraActive}
                            autoStopMs={5000}
                            className="sakura-stage--thumb"
                            onStop={() => {
                              setSakuraActive(false);
                              setSakuraTargetId(null);
                            }}
                            showToggleButton={false}
                          />
                        )}
                        {l.image_url ? (
                          <img src={l.image_url} alt={l.name} loading="lazy" />
                        ) : (
                          <span className="hiq-thumb-fallback">{initial}</span>
                        )}
                      </div>
                      <h2 className="hiq-heading" onClick={() => setDetails(l)} style={{ cursor: "pointer" }}>{l.name}</h2>
                      <p className="hiq-price">${Number(l.price).toFixed(2)}<span style={{ fontWeight: 400, opacity: 0.85 }}> /{l.price_unit}</span></p>
                      {l.description && <p className="hiq-desc">{l.description}</p>}
                      <ul className="hiq-tags">
                        <li className="hiq-tag">{l.stock_status}</li>
                        <li className="hiq-tag">{l.seller}</li>
                        {l.rating ? <li className="hiq-tag">★ {Number(l.rating).toFixed(1)}</li> : null}
                      </ul>
                      <div className="hiq-btn-wrap flex gap-2">
                        <button
                          className="hiq-purchase-btn flex-1"
                          disabled={outOfStock}
                          onClick={() => addToCart(l)}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          {outOfStock ? "Sold Out" : "Add To Cart"}
                        </button>
                        {l.user_id === user?.id && (
                          <button
                            onClick={() => deleteProduct.mutate(l.id)}
                            className="px-3 rounded-full text-destructive hover:bg-destructive/10"
                            title="Remove listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
        </section>
      </div>

      {/* Detail overlay */}
      {details && (
        <div className="fixed inset-0 z-50 bg-background animate-fade-in flex" onClick={() => setDetails(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary z-10" onClick={() => setDetails(null)}>
            <X className="w-6 h-6" />
          </button>
          <div className="flex flex-col md:flex-row w-full h-full items-center justify-center p-8 gap-10" onClick={(e) => e.stopPropagation()}>
            <div
              className="w-full md:w-1/2 max-w-md aspect-square rounded-3xl flex items-center justify-center overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${colorFor(details.name)}22, ${colorFor(details.name)}66)` }}
            >
              {details.image_url ? (
                <img src={details.image_url} alt={details.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-[10rem] font-black opacity-80" style={{ color: colorFor(details.name) }}>
                  {details.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="max-w-md">
              <p className="text-sm uppercase tracking-widest text-muted-foreground">{details.category}</p>
              <h2 className="font-display text-4xl font-extrabold mt-2">{details.name}</h2>
              <p className="text-muted-foreground mt-1">by <b>{details.seller}</b></p>
              {details.description && <p className="mt-4 text-sm">{details.description}</p>}
              <p className="font-bold text-3xl mt-6">${Number(details.price).toFixed(2)}<span className="text-base text-muted-foreground font-normal">/{details.price_unit}</span></p>
              <p className={`text-xs mt-2 font-medium ${details.stock_status === "In Stock" ? "text-success" : details.stock_status === "Limited" ? "text-warning" : "text-destructive"}`}>{details.stock_status}</p>
              <button
                disabled={details.stock_status === "Out of Stock"}
                onClick={() => { addToCart(details); setDetails(null); }}
                className="mt-8 bg-success text-success-foreground hover:opacity-90 disabled:bg-foreground disabled:opacity-60 px-8 py-4 rounded-xl font-bold uppercase tracking-wider"
              >
                Add to bag
              </button>
              {details.user_id === user?.id && (
                <button
                  onClick={() => { deleteProduct.mutate(details.id); setDetails(null); }}
                  className="ml-3 mt-8 inline-flex items-center gap-2 px-4 py-4 text-destructive hover:bg-destructive/10 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-foreground/30" onClick={() => setShowCart(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-2xl p-6 animate-slide-in-right overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold">Your bag ({cartCount})</h3>
              <button onClick={() => setShowCart(false)}><X className="w-5 h-5" /></button>
            </div>
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-sm">Your bag is empty.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 pb-3 border-b border-border">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black"
                        style={{ background: `${colorFor(item.name)}33`, color: colorFor(item.name) }}
                      >
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} × {item.qty}</p>
                      </div>
                      <p className="font-bold text-sm">${(item.price * item.qty).toFixed(2)}</p>
                      <button onClick={() => removeFromCart(item.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-display text-2xl font-bold">${cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={checkout}
                  disabled={placeOrder.isPending}
                  className="w-full mt-4 bg-success text-success-foreground py-4 rounded-xl font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-60"
                >
                  {placeOrder.isPending ? "Processing…" : "Checkout"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Orders drawer */}
      {showOrders && (
        <div className="fixed inset-0 z-50 bg-foreground/30" onClick={() => setShowOrders(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-2xl p-6 animate-slide-in-right overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold">Your orders</h3>
              <button onClick={() => setShowOrders(false)}><X className="w-5 h-5" /></button>
            </div>
            {!orders || orders.length === 0 ? (
              <p className="text-muted-foreground text-sm">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="text-sm font-medium">{o.product_name}</p>
                      <p className="text-xs text-muted-foreground">Qty {o.quantity} · ${Number(o.total_price).toFixed(2)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${o.status === "pending" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 relative ${sakuraActive ? "bg-foreground/50 backdrop-blur-sm" : "bg-foreground/40"}`} onClick={() => setShowAdd(false)}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-2xl space-y-3 animate-scale-in relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold">List a new product</h3>
                <button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                <input value={form.seller} onChange={e => setForm({ ...form, seller: e.target.value })} placeholder="Seller / farm name" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                <div className="flex gap-2">
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Price" className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                  <select value={form.price_unit} onChange={e => setForm({ ...form, price_unit: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                    <option value="ton">/ton</option><option value="bag">/bag</option><option value="kit">/kit</option><option value="pcs">/pcs</option><option value="kg">/kg</option>
                  </select>
                </div>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                  <option>Produce</option><option>Seeds</option><option>Supplies</option><option>Equipment</option>
                </select>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  />
                  <input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="Or paste image URL"
                    className="px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  />
                </div>
                {imagePreview && (
                  <div className="sm:col-span-2">
                    <img src={imagePreview} alt="Preview" className="h-28 rounded-xl border border-border object-cover" />
                  </div>
                )}
                <select value={form.stock_status} onChange={e => setForm({ ...form, stock_status: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                  <option>In Stock</option><option>Limited</option><option>Out of Stock</option>
                </select>
                <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} placeholder="Rating (0-5)" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="sm:col-span-2 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              </div>
              <button onClick={handleAdd} disabled={addProduct.isPending} className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold uppercase tracking-wide hover:opacity-90 disabled:opacity-60">
                {addProduct.isPending ? "Listing…" : "Publish listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MarketplacePage;
