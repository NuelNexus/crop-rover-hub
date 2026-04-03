import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Search, CloudSun, Droplets, Wind, Gauge, Sun, Clock, ChevronDown, Star, ShoppingCart, Plus, Sprout, BarChart3, User, Home as HomeIcon } from "lucide-react";
import { useNotes, useAddNote } from "@/hooks/useNotes";
import { useProducts } from "@/hooks/useMarketplace";
import { toast } from "sonner";
import plantImg from "@/assets/plant-monstera.png";
import farmImg from "@/assets/farm-landscape.jpg";
import { formatDistanceToNow } from "date-fns";

const categories = [
  { icon: Clock, label: "Duration" },
  { icon: BarChart3, label: "Return" },
  { icon: Sprout, label: "Low Risk" },
  { icon: Gauge, label: "Safety" },
];

const HomePage = () => {
  const { data: notes, isLoading: notesLoading } = useNotes();
  const { data: products } = useProducts();
  const addNote = useAddNote();
  const [newNote, setNewNote] = useState("");
  const [qty, setQty] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const firstProduct = products?.[0];

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate(newNote);
    setNewNote("");
  };

  const addToCart = () => {
    toast.success(`Added ${qty} item(s) to cart`);
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-muted-foreground text-sm">Hello, Good Morning</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {new Date().toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })} <ChevronDown className="w-3 h-3" />
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">JD</div>
          </div>

          <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 py-3 mb-5">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search here..." className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground" />
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Farm Location</p>
              <CloudSun className="w-8 h-8 text-warning" />
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-display text-4xl font-bold">29</span>
              <span className="text-lg">°C</span>
              <span className="text-xs text-muted-foreground ml-2">H: 32°C</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">L: 18°C</p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground mb-3">
              <div><p className="font-medium text-foreground">Humidity</p><p>65%</p></div>
              <div><p className="font-medium text-foreground">Precipitation</p><p>2.1ml</p></div>
              <div><p className="font-medium text-foreground">Pressure</p><p>1013 hPa</p></div>
              <div><p className="font-medium text-foreground">Wind</p><p>12 km/h</p></div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>5:45 am</span>
              <div className="flex-1 mx-3 h-0.5 bg-gradient-to-r from-warning/30 via-warning to-warning/30 rounded-full relative">
                <Sun className="w-4 h-4 text-warning absolute left-1/2 -translate-x-1/2 -top-1.5" />
              </div>
              <span>7:30 pm</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>Sunrise</span><span>Sunset</span>
            </div>
          </div>

          <div className="mb-5">
            <p className="font-semibold text-sm mb-3">Invest by Category</p>
            <div className="grid grid-cols-4 gap-3">
              {categories.map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-1.5 cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center hover:bg-primary/10 transition-colors">
                    <c.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">Best Offers</p>
              <span className="text-xs text-primary font-medium cursor-pointer">View all</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(products || []).slice(0, 4).map((p) => (
                <div key={p.id} className="rounded-xl overflow-hidden relative group cursor-pointer">
                  <img src={farmImg} alt={p.name} className="w-full h-20 object-cover rounded-xl" loading="lazy" />
                  <div className="absolute inset-0 bg-foreground/30 flex items-end p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white font-medium">{p.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-around mt-6 pt-4 border-t border-border">
            {[
              { icon: HomeIcon, label: "Home", active: true },
              { icon: Sprout, label: "All Farms", active: false },
              { icon: BarChart3, label: "Statistic", active: false },
              { icon: User, label: "My Profile", active: false },
            ].map((n) => (
              <div key={n.label} className={`flex flex-col items-center gap-1 text-[10px] cursor-pointer ${n.active ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                <n.icon className="w-5 h-5" /> {n.label}
              </div>
            ))}
          </div>
        </div>

        {/* Middle Panel – Farm Details */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex flex-col">
          <p className="font-display text-lg font-semibold text-center mb-4">Farm Details</p>
          <div className="flex justify-center mb-4">
            <div className="w-48 h-48 rounded-full border-2 border-primary/20 flex items-center justify-center">
              <img src={plantImg} alt="Lime Seedlings" className="w-40 h-40 object-contain" />
            </div>
          </div>

          <div className="flex justify-center gap-2 mb-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`w-10 h-10 rounded-full overflow-hidden border-2 ${i === 0 ? "border-primary" : "border-border"}`}>
                <img src={farmImg} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>

          <div className="mb-4">
            <h3 className="font-display text-xl font-bold">{firstProduct?.name || "Lime Seedlings"}</h3>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-success font-medium">{firstProduct?.stock_status || "Available in stock"}</span>
              <span className="font-display text-lg font-bold">${firstProduct?.price || 30}<span className="text-xs font-normal text-muted-foreground">/{firstProduct?.price_unit || "pcs"}</span></span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 text-warning fill-warning" />
                <span className="font-medium">{firstProduct?.rating || 4.9}</span>
                <span className="text-muted-foreground">(192)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary">−</button>
                <span className="font-medium">{qty}pcs</span>
                <button onClick={() => setQty(qty + 1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary">+</button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-1">Description</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {firstProduct?.description || "Premium quality seedlings ready for transplanting. Organic and sustainably grown."}
            </p>
          </div>

          <div className="mb-5">
            <h4 className="font-semibold text-sm mb-2">Related Products</h4>
            <div className="flex gap-2 overflow-x-auto">
              {(products || []).slice(1, 7).map((p) => (
                <div key={p.id} className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-border cursor-pointer hover:border-primary transition-colors">
                  <img src={farmImg} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>

          <button onClick={addToCart} className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-auto">
            <ShoppingCart className="w-4 h-4" /> Add To Cart
          </button>
        </div>

        {/* Right Panel – Notes */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex flex-col">
          <p className="font-display text-lg font-semibold text-center mb-4">Todays Weather</p>

          <div className="bg-secondary rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-US", { city: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                <p className="font-display text-5xl font-bold mt-1">29<span className="text-xl align-top">°C</span></p>
                <p className="text-xs text-muted-foreground mt-1">Humidity 65%</p>
              </div>
              <div className="text-right">
                <CloudSun className="w-12 h-12 text-warning mb-1" />
                <p className="text-xs font-medium">Partly Cloudy</p>
              </div>
            </div>
            <p className="text-xs text-primary mt-3 font-medium">Today is a good day to apply pesticides. Low wind speed detected.</p>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Notes</h3>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {notesLoading ? (
                <div className="animate-pulse h-20" />
              ) : (notes || []).map((n) => (
                <div key={n.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-border">
                    <img src={farmImg} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                    <p className="text-xs mt-0.5 leading-relaxed">{n.text}</p>
                  </div>
                </div>
              ))}
              {!notesLoading && (!notes || notes.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Write a note..."
              rows={2}
              className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm resize-none placeholder:text-muted-foreground"
            />
            <button
              onClick={handleAddNote}
              disabled={addNote.isPending || !newNote.trim()}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {addNote.isPending ? "Adding..." : "Add New Note"}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage;
