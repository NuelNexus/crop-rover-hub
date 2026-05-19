import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

type Device = {
  id: string;
  api_key: string;
};

type Reading = {
  sensor_type: string;
  value: number;
  unit: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const cleanText = (value: unknown, max = 120) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

async function restFetch(path: string, init: RequestInit = {}) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) throw new Error('Backend is not configured');

  return fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(init.headers || {}),
    },
  });
}

async function getDevice(req: Request): Promise<Device | Response> {
  const deviceId = req.headers.get('x-device-id')?.trim();
  const deviceKey = req.headers.get('x-device-key')?.trim();

  if (!deviceId || !deviceKey) {
    return json({ error: 'Missing device id or device key' }, 401);
  }

  const res = await restFetch(
    `/rest/v1/esp32_devices?id=eq.${encodeURIComponent(deviceId)}&select=id,api_key&limit=1`,
  );
  if (!res.ok) return json({ error: 'Could not verify device' }, 500);

  const rows = (await res.json()) as Device[];
  const device = rows[0];
  if (!device || device.api_key !== deviceKey) {
    return json({ error: 'Invalid device credentials' }, 401);
  }

  return device;
}

async function markOnline(deviceId: string, ip?: string | null) {
  await restFetch(`/rest/v1/esp32_devices?id=eq.${encodeURIComponent(deviceId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ is_online: true, last_seen: new Date().toISOString(), ip_address: ip || null }),
  });
}

function parseReadings(value: unknown): Reading[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) return null;

  const readings = value.map((item) => ({
    sensor_type: cleanText(item?.sensor_type, 60),
    value: Number(item?.value),
    unit: cleanText(item?.unit, 20),
  }));

  if (readings.some((r) => !r.sensor_type || !r.unit || !Number.isFinite(r.value))) return null;
  return readings;
}

async function analyzeImage(imageUrl: string) {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return null;

  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content:
            'You are Harvest IQ Vision, an agricultural pest, crop-health, and livestock visual analyst. Identify visible plants, animals, pests, disease symptoms, nutrient deficiencies, weeds, water stress, and other farm issues. Be accurate, concise, and actionable.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this ESP32-CAM farm image. Return one issue label, severity, and practical recommendation.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'report_analysis',
            description: 'Report the farm image analysis result',
            parameters: {
              type: 'object',
              properties: {
                detected_issue: { type: 'string' },
                severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                recommendation: { type: 'string' },
              },
              required: ['detected_issue', 'severity', 'recommendation'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'report_analysis' } },
    }),
  });

  if (!aiResp.ok) return null;
  const data = await aiResp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return null;

  try {
    return JSON.parse(toolCall.function.arguments) as {
      detected_issue: string;
      severity: 'low' | 'medium' | 'high';
      recommendation: string;
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  try {
    const verified = await getDevice(req);
    if (verified instanceof Response) return verified;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      const type = cleanText(body.type, 30);
      const ip = cleanText(body.ip, 60) || null;
      await markOnline(verified.id, ip);

      if (type === 'heartbeat') return json({ ok: true, status: 'online' });

      if (type === 'readings') {
        const readings = parseReadings(body.readings);
        if (!readings) return json({ error: 'Invalid readings' }, 400);

        const rows = readings.map((r) => ({ ...r, device_id: verified.id }));
        const insert = await restFetch('/rest/v1/esp32_sensor_readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(rows),
        });
        if (!insert.ok) return json({ error: await insert.text() }, 500);
        return json({ ok: true, inserted: rows.length });
      }

      return json({ error: 'Unknown payload type' }, 400);
    }

    if (!contentType.includes('image/jpeg') && !contentType.includes('image/jpg')) {
      return json({ error: 'Use application/json or image/jpeg' }, 415);
    }

    const imageBytes = new Uint8Array(await req.arrayBuffer());
    if (imageBytes.byteLength < 1000) return json({ error: 'Image is too small' }, 400);
    if (imageBytes.byteLength > 5_000_000) return json({ error: 'Image must be under 5 MB' }, 413);

    const location = cleanText(req.headers.get('x-location'), 160) || null;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    await markOnline(verified.id, ip);

    const filePath = `${verified.id}/${Date.now()}.jpg`;
    const upload = await restFetch(`/storage/v1/object/crop-cam/${filePath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' },
      body: imageBytes,
    });
    if (!upload.ok) return json({ error: await upload.text() }, 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const imageUrl = `${supabaseUrl}/storage/v1/object/public/crop-cam/${filePath}`;
    const analysis = await analyzeImage(imageUrl);

    const captureBody = {
      device_id: verified.id,
      image_url: imageUrl,
      location,
      analyzed: Boolean(analysis),
      detected_issue: analysis?.detected_issue || null,
      severity: analysis?.severity || 'low',
      ai_analysis: analysis?.recommendation || null,
    };

    const capture = await restFetch('/rest/v1/esp32_camera_captures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(captureBody),
    });
    if (!capture.ok) return json({ error: await capture.text() }, 500);

    const [row] = await capture.json();
    return json({ ok: true, capture: row, analysis });
  } catch (e) {
    console.error('esp32-ingest error', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
