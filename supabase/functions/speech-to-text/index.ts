// Speech-to-text via Lovable AI Gateway (OpenAI transcription).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "multipart/form-data required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "file required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const fd = new FormData();
    fd.append("file", file, file.name || "speech.webm");
    fd.append("model", "openai/gpt-4o-transcribe");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey },
      body: fd,
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      console.error("STT error", r.status, t.slice(0, 400));
      return new Response(JSON.stringify({ error: t.slice(0, 300) || "Transcription failed" }), {
        status: r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    return new Response(JSON.stringify({ text: (data?.text ?? "").trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
