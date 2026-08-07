import { corsHeaders, nimComplete, parseJsonLoose, json } from "../_shared/nim.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cropName, stage, progress, fieldLocation, category } = await req.json();

    const content = await nimComplete(
      [
        {
          role: "system",
          content: `You are an expert agricultural advisor. Provide detailed, actionable crop analysis. Reply with ONLY a JSON object (no markdown fences, no prose) with exactly these fields:
{
  "health_score": number (0-100),
  "growth_analysis": string (2-3 sentences about current growth stage),
  "recommendations": [string, string, string],
  "pest_risk": "Low" | "Medium" | "High",
  "pest_details": string,
  "optimal_harvest_window": string,
  "soil_recommendations": string,
  "water_needs": string,
  "expected_yield": string,
  "weather_sensitivity": string
}`,
        },
        {
          role: "user",
          content: `Analyze this crop:
- Crop: ${cropName}
- Category: ${category}
- Growth Stage: ${stage}
- Progress: ${progress}%
- Field Location: ${fieldLocation || "Not specified"}

Provide a comprehensive agricultural analysis with actionable insights.`,
        },
      ],
      { maxTokens: 2048, temperature: 0.4 },
    );

    const analysis = parseJsonLoose(content);
    if (!analysis) return json({ error: "Failed to parse AI response", raw: content }, 500);

    return json(analysis);
  } catch (e) {
    console.error("crop-analysis error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
