import AppLayout from "@/components/layout/AppLayout";
import { ShoppingCart, TrendingUp, Package, Star } from "lucide-react";

const listings = [
  { name: "Organic Wheat", price: "$320/ton", seller: "Green Valley Farm", rating: 4.8, stock: "In Stock" },
  { name: "Basmati Rice", price: "$580/ton", seller: "Punjab Agri Co.", rating: 4.9, stock: "In Stock" },
  { name: "Yellow Maize", price: "$210/ton", seller: "Midwest Grains", rating: 4.5, stock: "Limited" },
  { name: "Barley Seeds", price: "$45/bag", seller: "SeedMaster Inc.", rating: 4.7, stock: "In Stock" },
  { name: "NPK Fertilizer", price: "$85/bag", seller: "AgriChem Supply", rating: 4.6, stock: "In Stock" },
  { name: "Pest Control Kit", price: "$120/kit", seller: "BioGuard", rating: 4.4, stock: "Limited" },
];

const MarketplacePage = () => (
  <AppLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Marketplace</h1>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
          <ShoppingCart className="w-4 h-4" /> List Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((l) => (
          <div key={l.name} className="stat-card hover:shadow-md transition-shadow cursor-pointer">
            <div className="w-full h-28 bg-secondary rounded-xl mb-3 flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-sm">{l.name}</h3>
            <p className="font-display text-lg font-bold text-primary mt-1">{l.price}</p>
            <p className="text-xs text-muted-foreground mt-1">{l.seller}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="flex items-center gap-1 text-xs"><Star className="w-3 h-3 text-warning fill-warning" /> {l.rating}</span>
              <span className={`text-xs font-medium ${l.stock === "Limited" ? "text-warning" : "text-success"}`}>{l.stock}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </AppLayout>
);

export default MarketplacePage;
