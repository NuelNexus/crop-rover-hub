import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const systemPrompt = `You are Harvest IQ AI, an expert agricultural assistant specializing in crops, livestock, pests, plant diseases, soil, weather, and farm operations.

When a user uploads an image:
- If it shows a plant, crop, leaf, fruit, flower, or tree: identify the species if possible, describe its condition, detect any signs of disease (blight, rust, mildew, mosaic virus, etc.), pest damage (insects, eggs, larvae, holes, discoloration), nutrient deficiencies, or stress. Recommend specific treatments.
- If it shows an animal (livestock, poultry, pests, wildlife): identify the species, assess visible health/condition, and flag concerns.
- If the image is not plant or animal related: politely say you specialize in agriculture and ask how you can help with their farm.

Always be specific, actionable, and concise. Use markdown formatting with bullet points and bold for key findings.`;

// Convert OpenAI-style messages (with array content parts) to Gemini "contents" format.
function toGeminiContents(messages: any[]) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      const parts: any[] = [];
      if (typeof m.content === 'string') {
        parts.push({ text: m.content });
      } else if (Array.isArray(m.content)) {
        for (const p of m.content) {
          if (p.type === 'text') parts.push({ text: p.text });
          else if (p.type === 'image_url' && p.image_url?.url) {
            const url = p.image_url.url as string;
            const match = url.match(/^data:(.+?);base64,(.+)$/);
            if (match) {
              parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
            }
          }
        }
      }
      return { role, parts };
    });
}

// Stream Gemini SSE and convert to OpenAI-style SSE deltas the client expects.
async function streamGemini(apiKey: string, messages: any[]) {
  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: toGeminiContents(messages),
  };
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => '');
    throw new Response(JSON.stringify({ error: `Gemini ${upstream.status}: ${t.slice(0, 300)}` }), {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let buf = '';

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        return;
      }
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;
        try {
          const j = JSON.parse(data);
          const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
          if (text) {
            const openaiChunk = { choices: [{ delta: { content: text } }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
          }
        } catch {}
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

async function streamLovable(apiKey: string, messages: any[]) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    return new Response(JSON.stringify({ error: errText }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return new Response(response.body, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (GEMINI_API_KEY) {
      try {
        return await streamGemini(GEMINI_API_KEY, messages);
      } catch (e) {
        if (e instanceof Response) return e;
        console.error('Gemini failed, falling back to Lovable AI', e);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'No AI key configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return await streamLovable(LOVABLE_API_KEY, messages);
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
