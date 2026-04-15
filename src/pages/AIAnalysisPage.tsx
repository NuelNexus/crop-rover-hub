import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useCrops } from "@/hooks/useCrops";
import { useCropAnalysis } from "@/hooks/useCropAnalysis";
import { useStorageBins } from "@/hooks/useStorage";
import { Brain, Loader2, Sprout, Warehouse, AlertTriangle, TrendingUp, Droplets, Sun, Bug, Leaf } from "lucide-react";

const AIAnalysisPage = () => {
  const { data: crops } = useCrops();
  const { data: bins } = useStorageBins();
  const { analysis, loading, analyze } = useCropAnalysis();
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);

  const selectedCrop = crops?.find((c) => c.id === selectedCropId);

  const handleAnalyze = (crop: any) => {
    setSelectedCropId(crop.id);
    analyze({
      name: crop.name,
      stage: crop.stage,
      progress: crop.progress,
      field_location: crop.field_location,
      category: crop.category,
    });
  };

  const highRiskBins = bins?.filter((b) => b.spoilage_risk === "High" || b.spoilage_risk === "Critical") || [];
  const cropsNearHarvest = crops?.filter((c) => c.progress >= 80) || [];
  const earlyCrops = crops?.filter((c) => c.progress < 30) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">AI Analysis Center</h1>
            <p className="text-sm text-muted-foreground">Comprehensive AI-powered farm insights</p>
          </div>
        </div>

        {/* Quick insights from real data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card border-l-4 border-l-primary">
            <div className="flex items-center gap-2 mb-2">
              <Sprout className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Crops</span>
            </div>
            <p className="font-display text-2xl font-bold">{crops?.length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{cropsNearHarvest.length} near harvest</p>
          </div>
          <div className="stat-card border-l-4 border-l-success">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Avg Progress</span>
            </div>
            <p className="font-display text-2xl font-bold">
              {crops?.length ? Math.round(crops.reduce((a, c) => a + c.progress, 0) / crops.length) : 0}%
            </p>
          </div>
          <div className="stat-card border-l-4 border-l-warning">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Storage Alerts</span>
            </div>
            <p className="font-display text-2xl font-bold">{highRiskBins.length}</p>
            <p className="text-xs text-muted-foreground mt-1">bins at risk</p>
          </div>
          <div className="stat-card border-l-4 border-l-chart-blue">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-chart-blue" />
              <span className="text-xs text-muted-foreground">Early Stage</span>
            </div>
            <p className="font-display text-2xl font-bold">{earlyCrops.length}</p>
            <p className="text-xs text-muted-foreground mt-1">need attention</p>
          </div>
        </div>

        {/* Auto-generated insights */}
        <div className="stat-card">
          <h2 className="font-display text-lg font-semibold mb-4">Farm Health Summary</h2>
          <div className="space-y-3">
            {cropsNearHarvest.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-success/5 border border-success/20">
                <TrendingUp className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Ready for Harvest</p>
                  <p className="text-xs text-muted-foreground">{cropsNearHarvest.map((c) => `${c.name} (${c.progress}%)`).join(", ")} — schedule harvesting soon.</p>
                </div>
              </div>
            )}
            {earlyCrops.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Droplets className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Early Growth Care</p>
                  <p className="text-xs text-muted-foreground">{earlyCrops.map((c) => c.name).join(", ")} in early stages. Ensure consistent irrigation and nutrient supply.</p>
                </div>
              </div>
            )}
            {highRiskBins.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Storage Risk Detected</p>
                  <p className="text-xs text-muted-foreground">{highRiskBins.map((b) => `${b.bin_name} (${b.crop_stored})`).join(", ")} — check temperature and humidity levels.</p>
                </div>
              </div>
            )}
            {crops?.some((c) => c.stage === "Vegetative") && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20">
                <Bug className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Pest Risk — Vegetative Stage</p>
                  <p className="text-xs text-muted-foreground">
                    Crops in vegetative stage ({crops.filter((c) => c.stage === "Vegetative").map((c) => c.name).join(", ")}) are most vulnerable to pests. Inspect regularly.
                  </p>
                </div>
              </div>
            )}
            {(!crops || crops.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">Add crops to get AI-powered insights</p>
            )}
          </div>
        </div>

        {/* Per-crop deep analysis */}
        <div className="stat-card">
          <h2 className="font-display text-lg font-semibold mb-4">Deep Crop Analysis</h2>
          <p className="text-xs text-muted-foreground mb-4">Select a crop for detailed AI analysis powered by Lovable AI</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {(crops || []).map((crop) => (
              <button
                key={crop.id}
                onClick={() => handleAnalyze(crop)}
                disabled={loading && selectedCropId === crop.id}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedCropId === crop.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <p className="text-sm font-medium truncate">{crop.name}</p>
                <p className="text-xs text-muted-foreground">{crop.stage}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${crop.progress}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{crop.progress}%</span>
                </div>
                {loading && selectedCropId === crop.id && <Loader2 className="w-4 h-4 animate-spin text-primary mt-2" />}
              </button>
            ))}
          </div>

          {analysis && selectedCrop && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg font-semibold">Analysis: {selectedCrop.name}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-secondary/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Health Score</p>
                  <p className="font-display text-4xl font-bold text-primary">{analysis.health_score}</p>
                  <p className="text-xs text-muted-foreground">/100</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Pest Risk</p>
                  <p className={`font-display text-2xl font-bold ${analysis.pest_risk === "Low" ? "text-success" : analysis.pest_risk === "Medium" ? "text-warning" : "text-destructive"}`}>
                    {analysis.pest_risk}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{analysis.pest_details}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Expected Yield</p>
                  <p className="font-display text-lg font-bold">{analysis.expected_yield}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Growth Analysis</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis.growth_analysis}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
                <ul className="space-y-1.5">
                  {analysis.recommendations?.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">🌱 Soil Care</h4>
                  <p className="text-xs text-muted-foreground">{analysis.soil_recommendations}</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">💧 Water Needs</h4>
                  <p className="text-xs text-muted-foreground">{analysis.water_needs}</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">🌤️ Weather Sensitivity</h4>
                  <p className="text-xs text-muted-foreground">{analysis.weather_sensitivity}</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">📅 Harvest Window</h4>
                  <p className="text-xs text-muted-foreground">{analysis.optimal_harvest_window}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AIAnalysisPage;
