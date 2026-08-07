// Text-to-speech via Lovable AI Gateway (OpenAI TTS) — natural & multilingual.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_VOICE = "alloy";
const VALID = ["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { text, voice, voiceId } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const requested = String(voiceId || voice || "").toLowerCase();
    const v = VALID.includes(requested) ? requested : DEFAULT_VOICE;
    const input = String(text).slice(0, 4000);

    const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        voice: v,
        input,
        instructions: "Speak warmly and naturally, like a friendly farm advisor. Match the language of the text.",
      }),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      console.error("TTS error", r.status, t.slice(0, 400));
      return new Response(JSON.stringify({ error: t.slice(0, 300) || `TTS ${r.status}` }), {
        status: r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(r.body, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
