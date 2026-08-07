// Shared NVIDIA NIM (OpenAI-compatible) helpers for all Harvest IQ AI functions.
export const NIM_BASE = "https://integrate.api.nvidia.com/v1";
export const NIM_TEXT_MODEL = "z-ai/glm-5.2";
export const NIM_VISION_MODEL = "meta/llama-3.2-90b-vision-instruct";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function nimKey(): string {
  const key = Deno.env.get("NVIDIA_NIM_API_KEY");
  if (!key) throw new Error("NVIDIA_NIM_API_KEY is not configured");
  return key;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function nimFetch(body: Record<string, unknown>) {
  return await fetch(`${NIM_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${nimKey()}`,
      "Content-Type": "application/json",
      Accept: body.stream ? "text/event-stream" : "application/json",
    },
    body: JSON.stringify(body),
  });
}

/** Non-streaming completion returning plain text. */
export async function nimComplete(
  messages: unknown[],
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const r = await nimFetch({
    model: opts.model ?? NIM_TEXT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.6,
    top_p: 1,
    max_tokens: opts.maxTokens ?? 2048,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    console.error("NIM error", r.status, t.slice(0, 500));
    throw new Error(
      r.status === 429
        ? "AI is busy right now — please try again in a moment."
        : `AI request failed (${r.status})`,
    );
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** Strip markdown fences and parse the first JSON object/array found. */
export function parseJsonLoose<T = unknown>(raw: string): T | null {
  let s = (raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(s) as T;
  } catch {
    const m = s.match(/[[{][\s\S]*[\]}]/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch { /* ignore */ }
    }
    return null;
  }
}
