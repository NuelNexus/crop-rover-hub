import { AlertTriangle, Info, CheckCircle, Clock } from "lucide-react";
import { useAlerts, useMarkAlertRead } from "@/hooks/useAlerts";
import { formatDistanceToNow } from "date-fns";

const sevColors: Record<string, string> = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-success",
};

const sevIcons: Record<string, typeof AlertTriangle> = {
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle,
};

const AlertsPanel = () => {
  const { data: alerts, isLoading } = useAlerts();
  const markRead = useMarkAlertRead();

  if (isLoading) return <div className="stat-card animate-pulse h-48" />;

  return (
    <div>
      <h2 className="font-display text-lg font-semibold mb-3">Recent Alerts</h2>
      <div className="space-y-2">
        {(alerts || []).slice(0, 6).map((a) => {
          const Icon = sevIcons[a.severity] || Info;
          return (
            <div
              key={a.id}
              className={`stat-card flex items-start gap-3 py-3 cursor-pointer transition-opacity ${a.is_read ? "opacity-60" : ""}`}
              onClick={() => !a.is_read && markRead.mutate(a.id)}
            >
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sevColors[a.severity]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        {(!alerts || alerts.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">No alerts</p>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
