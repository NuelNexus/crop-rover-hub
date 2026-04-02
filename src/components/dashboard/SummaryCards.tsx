import { TrendingUp, TrendingDown } from "lucide-react";

const crops = [
  { name: "Wheat", total: "125", unit: "Tons", change: 12, up: true },
  { name: "Rice", total: "980", unit: "Tons", change: 33, up: true },
];

const SummaryCards = () => (
  <div>
    <h2 className="font-display text-lg font-semibold mb-3">Summary</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {crops.map((c) => (
        <div key={c.name} className="stat-card flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{c.name} · Total production</p>
            <p className="font-display text-3xl font-bold mt-1">
              {c.total} <span className="text-base font-normal text-muted-foreground">{c.unit}</span>
            </p>
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${c.up ? "text-success" : "text-destructive"}`}>
            {c.up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {c.change}%
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default SummaryCards;
