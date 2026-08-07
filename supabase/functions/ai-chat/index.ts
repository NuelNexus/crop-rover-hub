// NVIDIA NIM powered chat, streamed as OpenAI-compatible SSE so existing
// front-end consumers (AIAnalysisPage, SpeechToSpeech) work unchanged.
import { corsHeaders, nimFetch, NIM_TEXT_MODEL, NIM_VISION_MODEL, json } from "../_shared/nim.ts";

const SYSTEM_PROMPT = `You are Harvest IQ AI, an expert agricultural assistant specializing in crops, livestock, pests, plant diseases, soil, weather, and farm operations.

When a user uploads an image:
- If it shows a plant, crop, leaf, fruit, flower, or tree: identify the species if possible, describe its condition, detect any signs of disease, pest damage, nutrient deficiencies, or stress. Recommend specific treatments.
- If it shows an animal: identify the species, assess visible health/condition, and flag concerns.
- If the image is not plant or animal related: politely say you specialize in agriculture and ask how you can help with their farm.

Always be specific, actionable, and concise. Use markdown formatting with bullet points and bold for key findings.`;

function hasImage(content: unknown): boolean {
  return Array.isArray(content) && content.some((p: any) => p?.type === "image_url");
}

/** Flatten content-parts into a plain string (text-only models). */
function flatten(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");
  return content
    .map((p: any) => (p?.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) return json({ error: "messages array required" }, 400);

    const imageTurn = messages.some((m: any) => hasImage(m?.content));
    const model = imageTurn ? NIM_VISION_MODEL : NIM_TEXT_MODEL;

    // Vision model handles one image turn best: keep parts on turns with images,
    // flatten everything else.
    const outMessages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
    for (const m of messages) {
      if (!m || !m.role) continue;
      if (m.role === "system") {
        outMessages[0].content += "\n\n" + flatten(m.content);
        continue;
      }
      if (m.role !== "user" && m.role !== "assistant") continue;
      outMessages.push({
        role: m.role,
        content: hasImage(m.content) ? m.content : flatten(m.content),
      });
    }

    const upstream = await nimFetch({
      model,
      messages: outMessages,
      temperature: 0.7,
      top_p: 1,
      max_tokens: imageTurn ? 2048 : 4096,
      stream: true,
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      console.error("NIM error", upstream.status, errText.slice(0, 500));
      return json(
        {
          error:
            upstream.status === 429
              ? "AI is busy right now — please try again in a moment."
              : errText.slice(0, 300) || "AI request failed",
        },
        upstream.status,
      );
    }

    // Pass through, filtering out reasoning-only deltas so the UI shows the answer.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buf = "";
        const emit = (delta: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`),
          );
        };
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data) continue;
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const j = JSON.parse(data);
                const d = j.choices?.[0]?.delta?.content;
                if (d) emit(d);
              } catch { /* ignore partial */ }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          console.error("stream error", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
