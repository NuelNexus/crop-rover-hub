import { useState } from "react";
import { Brain, Lightbulb, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { useCrops } from "@/hooks/useCrops";
import { useCropAnalysis } from "@/hooks/useCropAnalysis";

const AIInsights = () => {
  const { data: crops } = useCrops();
  const { analysis, loading, analyze } = useCropAnalysis();
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = () => {
    if (!crops?.length) return;
    const crop = crops[0];
    analyze({ name: crop.name, stage: crop.stage, progress: crop.progress, field_location: crop.field_location, category: crop.category });
    setAnalyzed(true);
  };

  const staticInsights = [
    {
      icon: AlertTriangle,
      title: "Pest Alert — Field B",
      desc: crops?.some(c => c.stage === "Vegetative")
        ? `AI detected potential pest risk for ${crops.find(c => c.stage === "Vegetative")?.name || "crops"} in vegetative stage. Recommend inspection.`
        : "No pest alerts at this time.",
      type: "alert",
    },
    {
      icon: TrendingUp,
      title: "Optimal Harvest Window",
      desc: crops?.some(c => c.progress >= 90)
        ? `${crops.filter(c => c.progress >= 90).map(c => c.name).join(", ")} at ${crops.filter(c => c.progress >= 90).map(c => c.progress).join("%, ")}% — ready for harvest.`
        : "No crops at harvest stage yet.",
      type: "info",
    },
    {
      icon: Lightbulb,
      title: "Growth Suggestion",
      desc: crops?.some(c => c.progress < 30)
        ? `${crops.filter(c => c.progress < 30).map(c => c.name).join(", ")} in early stages — ensure adequate irrigation and soil nutrition.`
        : "All crops are progressing well.",
      type: "suggestion",
    },
  ];

  const typeStyles: Record<string, string> = {
    alert: "border-l-destructive bg-destructive/5",
    info: "border-l-primary bg-primary/5",
    suggestion: "border-l-warning bg-warning/5",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">AI Insights</h2>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || !crops?.length}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
          {loading ? "Analyzing..." : "Deep Analysis"}
        </button>
      </div>

      <div className="space-y-3">
        {staticInsights.map((i) => (
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

        {analyzed && analysis && (
          <div className="stat-card border-l-4 border-l-primary bg-primary/5">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
              <div>
                <p className="font-medium text-sm">Deep AI Analysis — {crops?.[0]?.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{analysis.growth_analysis}</p>
                <div className="mt-2 space-y-1">
                  {analysis.recommendations?.slice(0, 2).map((r, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {r}</p>
                  ))}
                </div>
                <p className="text-xs mt-2"><span className="font-medium">Health:</span> {analysis.health_score}/100 · <span className="font-medium">Yield:</span> {analysis.expected_yield}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;
