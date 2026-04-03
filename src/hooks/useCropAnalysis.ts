import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CropAnalysis = {
  health_score: number;
  growth_analysis: string;
  recommendations: string[];
  pest_risk: string;
  pest_details: string;
  optimal_harvest_window: string;
  soil_recommendations: string;
  water_needs: string;
  expected_yield: string;
  weather_sensitivity: string;
};

export const useCropAnalysis = () => {
  const [analysis, setAnalysis] = useState<CropAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async (crop: { name: string; stage: string; progress: number; field_location?: string | null; category: string }) => {
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("crop-analysis", {
        body: {
          cropName: crop.name,
          stage: crop.stage,
          progress: crop.progress,
          fieldLocation: crop.field_location,
          category: crop.category,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAnalysis(data as CropAnalysis);
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze crop");
    } finally {
      setLoading(false);
    }
  };

  return { analysis, loading, analyze };
};
