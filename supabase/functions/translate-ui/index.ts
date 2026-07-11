// High-accuracy batch UI translation via Lovable AI Gateway (Gemini 2.5 Pro)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { strings, target, targetName } = await req.json();
    if (!Array.isArray(strings) || strings.length === 0 || !target) {
      return new Response(JSON.stringify({ error: "strings[] and target required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chunks: string[][] = [];
    const CHUNK = 60;
    for (let i = 0; i < strings.length; i += CHUNK) chunks.push(strings.slice(i, i + CHUNK));

    const translations: string[] = [];
    for (const chunk of chunks) {
      const payload = {
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert professional translator for software UI. Translate every English string in the JSON array into natural, idiomatic ${targetName || target} (ISO code: ${target}). 
Rules:
- Use the most natural, native phrasing — NOT literal word-by-word translation.
- Preserve all punctuation, emojis, numbers, units, and placeholders like {name}, %s, %d, $1 exactly.
- Keep brand/product names ("Harvest IQ", "CropRover") untranslated.
- Keep the same length tone (short labels stay short).
- Reply with ONLY a JSON array of translated strings, same length and order. No prose, no markdown fences, no explanation.`,
          },
          { role: "user", content: JSON.stringify(chunk) },
        ],
      };

      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const text = await r.text();
        console.error("AI gateway error", r.status, text);
        translations.push(...chunk);
        continue;
      }

      const json = await r.json();
      let content: string = json.choices?.[0]?.message?.content ?? "[]";
      content = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
      try {
        const arr = JSON.parse(content);
        if (Array.isArray(arr) && arr.length === chunk.length) {
          translations.push(...arr.map((s) => String(s)));
        } else {
          translations.push(...chunk);
        }
      } catch {
        translations.push(...chunk);
      }
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
