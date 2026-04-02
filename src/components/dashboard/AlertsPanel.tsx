import { AlertTriangle, Info, CheckCircle, Clock } from "lucide-react";

const alerts = [
  { icon: AlertTriangle, text: "High temperature alert in Bin B — 28°C exceeds threshold", time: "2 min ago", severity: "high" },
  { icon: Info, text: "CropRover completed Field A scan — 3 anomalies detected", time: "15 min ago", severity: "medium" },
  { icon: CheckCircle, text: "Irrigation cycle completed for Section 2", time: "1 hr ago", severity: "low" },
  { icon: AlertTriangle, text: "Soil moisture critically low in Field C", time: "2 hr ago", severity: "high" },
];

const sevColors: Record<string, string> = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-success",
};

const AlertsPanel = () => (
  <div>
    <h2 className="font-display text-lg font-semibold mb-3">Recent Alerts</h2>
    <div className="space-y-2">
      {alerts.map((a, idx) => (
        <div key={idx} className="stat-card flex items-start gap-3 py-3">
          <a.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sevColors[a.severity]}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-snug">{a.text}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {a.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AlertsPanel;
