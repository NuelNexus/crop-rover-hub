// Anthropic-powered chat, streamed as OpenAI-compatible SSE so existing
// front-end consumers (AIAnalysisPage, SpeechToSpeech) work unchanged.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEM_PROMPT = `You are Harvest IQ AI, an expert agricultural assistant specializing in crops, livestock, pests, plant diseases, soil, weather, and farm operations.

When a user uploads an image:
- If it shows a plant, crop, leaf, fruit, flower, or tree: identify the species if possible, describe its condition, detect any signs of disease, pest damage, nutrient deficiencies, or stress. Recommend specific treatments.
- If it shows an animal: identify the species, assess visible health/condition, and flag concerns.
- If the image is not plant or animal related: politely say you specialize in agriculture and ask how you can help with their farm.

Always be specific, actionable, and concise. Use markdown formatting with bullet points and bold for key findings.`;

const MODEL = 'claude-3-5-sonnet-20241022';

// Convert an OpenAI-style message (string or content-parts array with image_url)
// into Anthropic's content-block format.
function toAnthropicContent(content: unknown): unknown {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content ?? '');
  return content.map((part: any) => {
    if (part?.type === 'text') return { type: 'text', text: part.text };
    if (part?.type === 'image_url') {
      const url: string = part.image_url?.url ?? part.image_url ?? '';
      const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(url);
      if (m) {
        return {
          type: 'image',
          source: { type: 'base64', media_type: m[1], data: m[2] },
        };
      }
      return { type: 'image', source: { type: 'url', url } };
    }
    return { type: 'text', text: String(part?.text ?? '') };
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Split system prompt(s) from turn messages; Anthropic wants system at top-level.
    const systemParts: string[] = [];
    const turns: { role: 'user' | 'assistant'; content: unknown }[] = [];
    for (const m of messages) {
      if (m.role === 'system') {
        if (typeof m.content === 'string') systemParts.push(m.content);
        continue;
      }
      if (m.role === 'user' || m.role === 'assistant') {
        turns.push({ role: m.role, content: toAnthropicContent(m.content) });
      }
    }
    const system = [SYSTEM_PROMPT, ...systemParts].join('\n\n');

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system,
        messages: turns,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => '');
      console.error('Anthropic error', upstream.status, errText);
      return new Response(
        JSON.stringify({
          error: upstream.status === 429
            ? 'AI is busy right now — please try again in a moment.'
            : errText || 'AI request failed',
        }),
        { status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Transform Anthropic SSE → OpenAI-compatible chat.completion.chunk SSE.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buf = '';
        const emit = (delta: string) => {
          const payload = { choices: [{ delta: { content: delta } }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const j = JSON.parse(data);
                if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta') {
                  emit(j.delta.text || '');
                } else if (j.type === 'message_stop') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                }
              } catch {}
            }
          }
        } catch (e) {
          console.error('stream transform error', e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
