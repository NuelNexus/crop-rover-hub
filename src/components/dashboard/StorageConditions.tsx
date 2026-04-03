import { Thermometer, Droplets, AlertTriangle, CheckCircle } from "lucide-react";
import { useStorageBins } from "@/hooks/useStorage";

const StorageConditions = () => {
  const { data: bins, isLoading } = useStorageBins();

  if (isLoading) return <div className="stat-card animate-pulse h-48" />;

  return (
    <div>
      <h2 className="font-display text-lg font-semibold mb-3">Storage Conditions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(bins || []).map((b) => {
          const ok = b.spoilage_risk === "Low";
          return (
            <div key={b.id} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-sm">{b.bin_name} — {b.crop_stored}</p>
                  <p className="text-xs text-muted-foreground">{b.fill_percentage}% capacity</p>
                </div>
                {ok ? <CheckCircle className="w-5 h-5 text-success" /> : <AlertTriangle className="w-5 h-5 text-warning" />}
              </div>
              <div className="w-full h-2 bg-secondary rounded-full mb-3">
                <div className={`h-full rounded-full ${ok ? "bg-primary" : "bg-warning"}`} style={{ width: `${b.fill_percentage}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" />{b.temperature}°C</span>
                <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{b.humidity}%</span>
                <span>Spoilage: <span className={ok ? "text-success" : "text-warning"}>{b.spoilage_risk}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StorageConditions;
