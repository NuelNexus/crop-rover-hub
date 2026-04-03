import { TrendingUp, TrendingDown } from "lucide-react";
import { useCrops } from "@/hooks/useCrops";
import { useHarvests } from "@/hooks/useHarvests";

const SummaryCards = () => {
  const { data: crops } = useCrops();
  const { data: harvests } = useHarvests();

  const totalCrops = crops?.length || 0;
  const maturedCrops = crops?.filter(c => c.stage === "Matured").length || 0;
  const totalYield = harvests?.reduce((sum, h) => sum + Number(h.quantity), 0) || 0;
  const avgProgress = crops?.length ? Math.round(crops.reduce((s, c) => s + c.progress, 0) / crops.length) : 0;

  const summaryItems = [
    { name: "Total Crops", total: String(totalCrops), unit: "Active", change: maturedCrops, up: true, label: `${maturedCrops} matured` },
    { name: "Total Harvest", total: String(totalYield), unit: "Tons", change: avgProgress, up: true, label: `${avgProgress}% avg growth` },
  ];

  return (
    <div>
      <h2 className="font-display text-lg font-semibold mb-3">Summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {summaryItems.map((c) => (
          <div key={c.name} className="stat-card flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{c.name}</p>
              <p className="font-display text-3xl font-bold mt-1">
                {c.total} <span className="text-base font-normal text-muted-foreground">{c.unit}</span>
              </p>
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${c.up ? "text-success" : "text-destructive"}`}>
              {c.up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummaryCards;
