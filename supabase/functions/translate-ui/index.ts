// Batch UI translation via Lovable AI Gateway
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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chunk to keep prompts manageable
    const chunks: string[][] = [];
    const CHUNK = 80;
    for (let i = 0; i < strings.length; i += CHUNK) chunks.push(strings.slice(i, i + CHUNK));

    const translations: string[] = [];
    for (const chunk of chunks) {
      const payload = {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional UI translator. Translate each English string to ${targetName || target} (language code: ${target}). Keep punctuation, emojis, numbers, and placeholders like {name} or %s exactly as-is. Reply ONLY with a JSON array of strings of the same length and order. No prose, no markdown fences.`,
          },
          { role: "user", content: JSON.stringify(chunk) },
        ],
      };

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const text = await r.text();
        console.error("AI gateway error", r.status, text);
        // fallback: original strings
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
