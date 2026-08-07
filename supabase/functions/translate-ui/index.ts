// High-accuracy batch UI translation via NVIDIA NIM
import { corsHeaders, nimComplete, parseJsonLoose, json } from "../_shared/nim.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { strings, target, targetName } = await req.json();
    if (!Array.isArray(strings) || strings.length === 0 || !target) {
      return json({ error: "strings[] and target required" }, 400);
    }

    const chunks: string[][] = [];
    const CHUNK = 60;
    for (let i = 0; i < strings.length; i += CHUNK) chunks.push(strings.slice(i, i + CHUNK));

    const translations: string[] = [];
    for (const chunk of chunks) {
      try {
        const content = await nimComplete(
          [
            {
              role: "system",
              content: `You are an expert professional translator for software UI. Translate every English string in the JSON array into natural, idiomatic ${targetName || target} (ISO code: ${target}).
Rules:
- Use the most natural, native phrasing — NOT literal word-by-word translation.
- Preserve all punctuation, emojis, numbers, units, and placeholders like {name}, %s, %d, $1 exactly.
- Keep brand/product names ("Harvest IQ", "CropRover") untranslated.
- Keep short labels short.
- Reply with ONLY a JSON array of translated strings, same length and order. No prose, no markdown fences.`,
            },
            { role: "user", content: JSON.stringify(chunk) },
          ],
          { temperature: 0.2, maxTokens: 4096 },
        );
        const arr = parseJsonLoose<string[]>(content);
        if (Array.isArray(arr) && arr.length === chunk.length) {
          translations.push(...arr.map((s) => String(s)));
        } else {
          translations.push(...chunk);
        }
      } catch (err) {
        console.error("translate chunk failed", err);
        translations.push(...chunk);
      }
    }

    return json({ translations });
  } catch (e: any) {
    return json({ error: e?.message ?? "unknown error" }, 500);
  }
});
