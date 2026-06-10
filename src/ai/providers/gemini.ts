import { env } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
import type { AIProvider, AIRequest, AIResponse, AIToolDefinition, AIMessage } from '../types';

// Gemini provider — calls the `ai-chat` Supabase Edge Function which holds the
// GEMINI_API_KEY server-side. JWT verification is enforced by Supabase, so only
// signed-in users can invoke it.
//
// Docs:
//   https://ai.google.dev/api/generate-content
//   https://ai.google.dev/gemini-api/docs/function-calling

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: 'user' | 'model' | 'function';
  parts: GeminiPart[];
}

function toGeminiTools(tools: AIToolDefinition[]) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}

function toGeminiContents(messages: AIMessage[]): {
  system: string | null;
  contents: GeminiContent[];
} {
  let system: string | null = null;
  const contents: GeminiContent[] = [];

  for (const m of messages) {
    if (m.role === 'system') {
      system = system ? system + '\n\n' + m.content : m.content;
      continue;
    }
    if (m.role === 'tool') {
      let payload: Record<string, unknown>;
      try {
        const parsed = JSON.parse(m.content);
        payload =
          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : { result: parsed };
      } catch {
        payload = { result: m.content };
      }
      contents.push({
        role: 'function',
        parts: [{ functionResponse: { name: m.toolName ?? 'tool', response: payload } }],
      });
      continue;
    }
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  }
  return { system, contents };
}

async function callEdge(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await getSupabase().functions.invoke('ai-chat', { body });
  if (error) {
    // supabase-js wraps non-2xx into FunctionsHttpError with the raw Response on .context
    let detail = String(error.message || 'unknown error');
    const ctx: any = (error as any).context;
    if (ctx && typeof ctx.text === 'function') {
      try {
        const text = await ctx.text();
        try {
          const j = JSON.parse(text);
          detail =
            j?.error?.message ||
            (typeof j?.error === 'string' ? j.error : null) ||
            j?.message ||
            text;
        } catch {
          if (text) detail = text;
        }
      } catch {}
    }
    throw new Error(detail);
  }
  return data;
}

export const GeminiProvider: AIProvider = {
  name: 'gemini',
  async send(req: AIRequest): Promise<AIResponse> {
    const model = env.AI_MODEL || 'gemini-1.5-flash';
    const tools = req.tools ?? [];
    const toolCallsCollected: NonNullable<AIResponse['toolCalls']> = [];

    const { system, contents } = toGeminiContents(req.messages);
    const baseBody: Record<string, unknown> = {
      model,
      contents,
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      ...(tools.length
        ? {
            tools: toGeminiTools(tools),
            toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
          }
        : {}),
      generationConfig: { temperature: 0.4 },
    };

    let response = await callEdge(baseBody);

    for (let i = 0; i < 4; i++) {
      const candidate = response?.candidates?.[0];
      const parts: GeminiPart[] = candidate?.content?.parts ?? [];
      const functionCalls = parts.filter((p) => p.functionCall);

      if (functionCalls.length === 0) {
        const reply = parts
          .map((p) => p.text)
          .filter(Boolean)
          .join('\n')
          .trim();
        return { reply, toolCalls: toolCallsCollected };
      }

      contents.push({ role: 'model', parts });

      const responseParts: GeminiPart[] = [];
      for (const p of functionCalls) {
        const call = p.functionCall!;
        const def = tools.find((t) => t.name === call.name);
        let result: unknown;
        try {
          result = def
            ? await def.handler(call.args ?? {})
            : { error: `unknown tool: ${call.name}` };
          toolCallsCollected.push({ name: call.name, args: call.args ?? {}, result });
        } catch (err: any) {
          result = { error: String(err?.message ?? err) };
        }
        responseParts.push({
          functionResponse: {
            name: call.name,
            response:
              result && typeof result === 'object' && !Array.isArray(result)
                ? (result as Record<string, unknown>)
                : { result },
          },
        });
      }
      contents.push({ role: 'function', parts: responseParts });

      response = await callEdge(baseBody);
    }

    const finalParts: GeminiPart[] = response?.candidates?.[0]?.content?.parts ?? [];
    return {
      reply: finalParts
        .map((p) => p.text)
        .filter(Boolean)
        .join('\n')
        .trim(),
      toolCalls: toolCallsCollected,
    };
  },
};
