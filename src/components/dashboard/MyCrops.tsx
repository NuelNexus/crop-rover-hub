const crops = [
  { name: "Barley", stage: "Maturing", pct: 90, color: "bg-primary" },
  { name: "Millet", stage: "Ripening", pct: 85, color: "bg-chart-green" },
  { name: "Corn", stage: "Vegetative", pct: 23, color: "bg-chart-orange" },
  { name: "Oats", stage: "Ripening", pct: 75, color: "bg-primary" },
  { name: "Rice", stage: "Seed Started", pct: 15, color: "bg-chart-yellow" },
  { name: "Wheat", stage: "Matured", pct: 100, color: "bg-primary" },
];

const MyCrops = () => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-lg font-semibold">My Crops</h2>
      <span className="text-xs text-primary font-medium cursor-pointer">View All</span>
    </div>
    <div className="stat-card space-y-4">
      {crops.map((c) => (
        <div key={c.name} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {c.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{c.name}</p>
              <span className="text-xs font-semibold">{c.pct}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{c.stage}</p>
            <div className="w-full h-1.5 bg-secondary rounded-full mt-1">
              <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default MyCrops;
