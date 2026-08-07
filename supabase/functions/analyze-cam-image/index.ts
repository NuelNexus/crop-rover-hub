import { corsHeaders, nimComplete, parseJsonLoose, NIM_VISION_MODEL, json } from "../_shared/nim.ts";

type Analysis = { detected_issue: string; severity: string; recommendation: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { image_url, capture_id } = await req.json();
    if (!image_url) return json({ error: "image_url required" }, 400);

    const raw = await nimComplete(
      [
        {
          role: "system",
          content:
            "You are an expert agricultural pest & crop-health vision analyst. Inspect the image for pests, diseases, nutrient deficiencies, water stress, weeds, or anomalies. Reply with ONLY a JSON object: {\"detected_issue\": string (short label or 'Healthy'), \"severity\": \"low\"|\"medium\"|\"high\", \"recommendation\": string (2-3 sentences)}. No markdown fences, no prose.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this crop image and return the JSON object." },
            { type: "image_url", image_url: { url: image_url } },
          ],
        },
      ],
      { model: NIM_VISION_MODEL, maxTokens: 512, temperature: 0.3 },
    );

    const parsed = parseJsonLoose<Analysis>(raw);
    const args: Analysis = parsed ?? {
      detected_issue: "Unknown",
      severity: "low",
      recommendation: raw?.slice(0, 400) || "Could not analyze.",
    };

    if (capture_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${supabaseUrl}/rest/v1/esp32_camera_captures?id=eq.${capture_id}`, {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          ai_analysis: args.recommendation,
          detected_issue: args.detected_issue,
          severity: args.severity,
          analyzed: true,
        }),
      });
    }

    return json(args);
  } catch (e) {
    console.error("analyze-cam-image error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
