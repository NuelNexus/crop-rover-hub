import AppLayout from "@/components/layout/AppLayout";
import { Search, CloudSun, Droplets, Wind, Gauge, Sun, Clock, ChevronDown, Star, ShoppingCart, Plus, Sprout, BarChart3, User, Home as HomeIcon } from "lucide-react";
import plantImg from "@/assets/plant-monstera.png";
import farmImg from "@/assets/farm-landscape.jpg";

const categories = [
  { icon: Clock, label: "Duration" },
  { icon: BarChart3, label: "Return" },
  { icon: Sprout, label: "Low Risk" },
  { icon: Gauge, label: "Safety" },
];

const bestOffers = [
  { id: 1, label: "Wheat Field" },
  { id: 2, label: "Rice Paddy" },
  { id: 3, label: "Corn Plot" },
  { id: 4, label: "Barley Field" },
];

const relatedProducts = [
  { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 },
];

const notes = [
  { date: "May 24 . 5:43pm", text: "Excellent harvest, the grapes have a rich flavor and aroma." },
  { date: "May 24 . 5:43pm", text: "Excellent harvest, the grapes have a rich flavor and aroma." },
  { date: "May 24 . 5:43pm", text: "Excellent harvest, the grapes have a rich flavor and aroma." },
  { date: "May 24 . 5:43pm", text: "Excellent harvest, the grapes have a rich flavor and aroma." },
];

const HomePage = () => {
  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel – Home Screen */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex flex-col">
          {/* Greeting */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-muted-foreground text-sm">Hello, Good Morning</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Sunday, 01 Dec 2024 <ChevronDown className="w-3 h-3" />
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
              JD
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 py-3 mb-5">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search here..."
              className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
            />
          </div>

          {/* Weather Card */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Chateauneuf-du-Pape</p>
              <CloudSun className="w-8 h-8 text-warning" />
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-display text-4xl font-bold">+17</span>
              <span className="text-lg">°C</span>
              <span className="text-xs text-muted-foreground ml-2">H: 23°C</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">L: 14°C</p>

            <div className="grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground mb-3">
              <div>
                <p className="font-medium text-foreground">Humidity</p>
                <p>40%</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Precipitation</p>
                <p>5.1ml</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Pressure</p>
                <p>450 hpa</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Wind</p>
                <p>23m/s</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>5:25 am</span>
              <div className="flex-1 mx-3 h-0.5 bg-gradient-to-r from-warning/30 via-warning to-warning/30 rounded-full relative">
                <Sun className="w-4 h-4 text-warning absolute left-1/2 -translate-x-1/2 -top-1.5" />
              </div>
              <span>8:04 am</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>Sunrise</span>
              <span>Sunset</span>
            </div>
          </div>

          {/* Invest by Category */}
          <div className="mb-5">
            <p className="font-semibold text-sm mb-3">Invest by Category</p>
            <div className="grid grid-cols-4 gap-3">
              {categories.map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                    <c.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Best Offers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">Best Offers</p>
              <span className="text-xs text-primary font-medium cursor-pointer">View all</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {bestOffers.map((o) => (
                <div key={o.id} className="rounded-xl overflow-hidden">
                  <img src={farmImg} alt={o.label} className="w-full h-20 object-cover rounded-xl" loading="lazy" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Nav */}
          <div className="flex items-center justify-around mt-6 pt-4 border-t border-border">
            {[
              { icon: HomeIcon, label: "Home", active: true },
              { icon: Sprout, label: "All Farms", active: false },
              { icon: BarChart3, label: "Statistic", active: false },
              { icon: User, label: "My Profile", active: false },
            ].map((n) => (
              <div key={n.label} className={`flex flex-col items-center gap-1 text-[10px] ${n.active ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                <n.icon className="w-5 h-5" />
                {n.label}
              </div>
            ))}
          </div>
        </div>

        {/* Middle Panel – Farm Details */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex flex-col">
          <p className="font-display text-lg font-semibold text-center mb-4">Farm Details</p>

          {/* Plant Image */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-48 h-48 rounded-full border-2 border-primary/20 flex items-center justify-center">
                <img src={plantImg} alt="Lime Seedlings" className="w-40 h-40 object-contain" />
              </div>
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="flex justify-center gap-2 mb-5">
            {relatedProducts.slice(0, 5).map((_, i) => (
              <div key={i} className={`w-10 h-10 rounded-full overflow-hidden border-2 ${i === 0 ? "border-primary" : "border-border"}`}>
                <img src={farmImg} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>

          {/* Product Info */}
          <div className="mb-4">
            <h3 className="font-display text-xl font-bold">Lime Seedlings</h3>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-success font-medium">Available in stock</span>
              <span className="font-display text-lg font-bold">$30<span className="text-xs font-normal text-muted-foreground">/pcs</span></span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 text-warning fill-warning" />
                <span className="font-medium">4.9</span>
                <span className="text-muted-foreground">(192)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary">−</button>
                <span className="font-medium">1pcs</span>
                <button className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary">+</button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-1">Description</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Limes are closely related to lemons. They even 100k similar to them. Lime tree harvest is....
              <span className="text-primary font-medium cursor-pointer"> Read More</span>
            </p>
          </div>

          {/* Related Products */}
          <div className="mb-5">
            <h4 className="font-semibold text-sm mb-2">Related Products</h4>
            <div className="flex gap-2 overflow-x-auto">
              {relatedProducts.map((_, i) => (
                <div key={i} className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-border">
                  <img src={farmImg} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>

          {/* Add to Cart Button */}
          <button className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-auto">
            <ShoppingCart className="w-4 h-4" /> Add To Cart
          </button>
        </div>

        {/* Right Panel – Today's Weather + Notes */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex flex-col">
          <p className="font-display text-lg font-semibold text-center mb-4">Todays Weather</p>

          {/* Weather Banner */}
          <div className="bg-secondary rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs text-muted-foreground">Bekasi Timur, 27 Nov 2023</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-5xl font-bold">33<span className="text-xl align-top">°C</span></p>
                <p className="text-xs text-muted-foreground mt-1">Humidity 76%</p>
              </div>
              <div className="text-right">
                <CloudSun className="w-12 h-12 text-warning mb-1" />
                <p className="text-xs font-medium">Cloudy</p>
              </div>
            </div>
            <p className="text-xs text-primary mt-3 font-medium">Today is a good day to apply pesticides.</p>
          </div>

          {/* Notes */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Notes</h3>
              <button className="text-muted-foreground hover:text-foreground">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {notes.map((n, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-border">
                    <img src={farmImg} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{n.date}</p>
                    <p className="text-xs mt-0.5 leading-relaxed">{n.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Note Button */}
          <button className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-4">
            <Plus className="w-4 h-4" /> Add New Note
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage;
