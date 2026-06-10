// @ts-nocheck
// StockPilot AI — secure Gemini proxy with silent model rotation.
// Deployed to Supabase Edge Functions (Deno runtime).
// JWT verification is ON, so only signed-in users reach this code.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Fallback chain when a model hits rate limits or transient errors.
// Ordered by daily quota (larger quota first for sustained traffic).
const FALLBACK_CHAIN = [
  'gemini-1.5-flash-8b',     // 15 RPM, highly available free tier
  'gemini-1.5-flash',        // 15 RPM standard
  'gemini-2.0-flash',        // fallback
  'gemini-2.5-flash',        // fallback
];

interface RequestBody {
  model: string;
  contents: unknown;
  systemInstruction?: unknown;
  tools?: unknown;
  toolConfig?: unknown;
  generationConfig?: unknown;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface CallResult {
  ok: boolean;
  status: number;
  bodyText: string;
  model: string;
}

async function callGemini(
  model: string,
  apiKey: string,
  upstreamBody: Record<string, unknown>,
): Promise<CallResult> {
  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(upstreamBody),
      },
    );
    const bodyText = await res.text();
    return { ok: res.ok, status: res.status, bodyText, model };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      bodyText: JSON.stringify({ error: { message: String(err) } }),
      model,
    };
  }
}

function isRetryable(status: number, bodyText: string): boolean {
  // Retry on rate limit / quota and transient server errors
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  // Some Gemini responses use 200 but contain RESOURCE_EXHAUSTED in body — rare
  if (bodyText.includes('RESOURCE_EXHAUSTED')) return true;
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return jsonResponse(
      { error: 'GEMINI_API_KEY secret is not configured on the server.' },
      500,
    );
  }

  let payload: RequestBody;
  try {
    payload = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!payload.contents) {
    return jsonResponse({ error: 'Missing "contents"' }, 400);
  }

  const requested = payload.model || 'gemini-1.5-flash-8b';
  // Build candidate chain — requested first, then fallbacks (skip duplicates).
  const candidates = [
    requested,
    ...FALLBACK_CHAIN.filter((m) => m !== requested),
  ];

  const upstreamBody = {
    contents: payload.contents,
    ...(payload.systemInstruction ? { systemInstruction: payload.systemInstruction } : {}),
    ...(payload.tools ? { tools: payload.tools } : {}),
    ...(payload.toolConfig ? { toolConfig: payload.toolConfig } : {}),
    ...(payload.generationConfig ? { generationConfig: payload.generationConfig } : {}),
  };

  let last: CallResult | null = null;
  const triedModels: string[] = [];
  for (const model of candidates) {
    triedModels.push(model);
    const result = await callGemini(model, apiKey, upstreamBody);
    last = result;
    if (result.ok) {
      // Include a hint header so the client could detect rotation if it wants.
      return new Response(result.bodyText, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-ai-model-used': model,
          'x-ai-models-tried': triedModels.join(','),
        },
      });
    }
    if (!isRetryable(result.status, result.bodyText)) {
      // Permanent error (auth, bad request, etc) — return immediately.
      break;
    }
    // Otherwise loop to next fallback
  }

  // All exhausted — return last failure.
  return new Response(last?.bodyText ?? '{"error":"All models failed"}', {
    status: last?.status || 500,
    headers: {
      'Content-Type': 'application/json',
      'x-ai-models-tried': triedModels.join(','),
    },
  });
});
