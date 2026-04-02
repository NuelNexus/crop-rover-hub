import { Brain, Lightbulb, AlertTriangle, TrendingUp } from "lucide-react";

const insights = [
  {
    icon: AlertTriangle,
    title: "Pest Alert — Field B",
    desc: "AI detected early signs of aphid infestation in wheat section. Recommend immediate inspection.",
    type: "alert",
  },
  {
    icon: TrendingUp,
    title: "Optimal Harvest Window",
    desc: "Rice in Field A is projected to reach peak maturity in 5 days. Plan harvesting accordingly.",
    type: "info",
  },
  {
    icon: Lightbulb,
    title: "Irrigation Suggestion",
    desc: "Soil moisture in Section 3 is dropping below threshold. Schedule irrigation within 24h.",
    type: "suggestion",
  },
];

const typeStyles: Record<string, string> = {
  alert: "border-l-destructive bg-destructive/5",
  info: "border-l-primary bg-primary/5",
  suggestion: "border-l-warning bg-warning/5",
};

const AIInsights = () => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <Brain className="w-5 h-5 text-primary" />
      <h2 className="font-display text-lg font-semibold">AI Insights</h2>
    </div>
    <div className="space-y-3">
      {insights.map((i) => (
        <div key={i.title} className={`stat-card border-l-4 ${typeStyles[i.type]}`}>
          <div className="flex items-start gap-3">
            <i.icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{i.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{i.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AIInsights;
