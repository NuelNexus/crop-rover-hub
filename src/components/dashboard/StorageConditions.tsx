import { Thermometer, Droplets, AlertTriangle, CheckCircle } from "lucide-react";

const bins = [
  { id: "Bin A", crop: "Wheat", temp: "18°C", humidity: "55%", fill: 82, spoilage: "Low", ok: true },
  { id: "Bin B", crop: "Rice", temp: "16°C", humidity: "60%", fill: 94, spoilage: "Medium", ok: false },
  { id: "Bin C", crop: "Maize", temp: "20°C", humidity: "48%", fill: 45, spoilage: "Low", ok: true },
];

const StorageConditions = () => (
  <div>
    <h2 className="font-display text-lg font-semibold mb-3">Storage Conditions</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {bins.map((b) => (
        <div key={b.id} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-sm">{b.id} — {b.crop}</p>
              <p className="text-xs text-muted-foreground">{b.fill}% capacity</p>
            </div>
            {b.ok ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warning" />
            )}
          </div>
          <div className="w-full h-2 bg-secondary rounded-full mb-3">
            <div
              className={`h-full rounded-full ${b.ok ? "bg-primary" : "bg-warning"}`}
              style={{ width: `${b.fill}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" />{b.temp}</span>
            <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{b.humidity}</span>
            <span>Spoilage: <span className={b.ok ? "text-success" : "text-warning"}>{b.spoilage}</span></span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default StorageConditions;
