import { corsHeaders, nimComplete, NIM_VISION_MODEL, json } from "../_shared/nim.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { image_url } = await req.json();
    if (!image_url) return json({ error: "image_url required" }, 400);

    const description = await nimComplete(
      [
        {
          role: "system",
          content:
            "You are a food and item identification expert. Identify what is shown in the image. If it's food or produce, name the item, estimate freshness/ripeness, and note any visible spoilage. If it's an object/tool/equipment, name it and describe its purpose. Be concise (3-5 sentences).",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "What item or food is this? Provide a clear identification and short description." },
            { type: "image_url", image_url: { url: image_url } },
          ],
        },
      ],
      { model: NIM_VISION_MODEL, maxTokens: 512 },
    );

    return json({ description: description || "Could not identify the item." });
  } catch (e) {
    console.error("identify-item error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
