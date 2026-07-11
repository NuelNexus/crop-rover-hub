import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const systemPrompt = `You are Harvest IQ AI, an expert agricultural assistant specializing in crops, livestock, pests, plant diseases, soil, weather, and farm operations.

When a user uploads an image:
- If it shows a plant, crop, leaf, fruit, flower, or tree: identify the species if possible, describe its condition, detect any signs of disease, pest damage, nutrient deficiencies, or stress. Recommend specific treatments.
- If it shows an animal: identify the species, assess visible health/condition, and flag concerns.
- If the image is not plant or animal related: politely say you specialize in agriculture and ask how you can help with their farm.

Always be specific, actionable, and concise. Use markdown formatting with bullet points and bold for key findings.`;

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
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

    let lastError = '';
    let lastStatus = 500;

    for (const model of models) {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            stream: true,
          }),
        }
      );

      if (response.ok) {
        return new Response(response.body, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        });
      }

      lastError = await response.text().catch(() => '');
      lastStatus = response.status;
      if (response.status === 429 || response.status === 503) {
        console.warn(`Model ${model} returned ${response.status}, trying next...`);
        continue;
      }
      break;
    }

    return new Response(
      JSON.stringify({
        error:
          lastStatus === 429
            ? 'AI is busy right now — please try again in a moment.'
            : lastError || 'AI request failed',
      }),
      { status: lastStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
