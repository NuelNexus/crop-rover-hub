import { useCrops } from "@/hooks/useCrops";

const colorMap: Record<string, string> = {
  Matured: "bg-primary",
  Maturing: "bg-primary",
  Ripening: "bg-chart-green",
  Vegetative: "bg-chart-orange",
  "Seed Started": "bg-chart-yellow",
  Flowering: "bg-chart-blue",
};

const MyCrops = () => {
  const { data: crops, isLoading } = useCrops();

  if (isLoading) return <div className="stat-card animate-pulse h-48" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold">My Crops</h2>
        <span className="text-xs text-primary font-medium cursor-pointer">View All</span>
      </div>
      <div className="stat-card space-y-4">
        {(crops || []).slice(0, 6).map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {c.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{c.name}</p>
                <span className="text-xs font-semibold">{c.progress}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{c.stage}</p>
              <div className="w-full h-1.5 bg-secondary rounded-full mt-1">
                <div className={`h-full rounded-full ${colorMap[c.stage] || "bg-primary"}`} style={{ width: `${c.progress}%` }} />
              </div>
            </div>
          </div>
        ))}
        {(!crops || crops.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">No crops added yet</p>
        )}
      </div>
    </div>
  );
};

export default MyCrops;
