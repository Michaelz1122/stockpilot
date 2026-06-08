import { env } from '@/lib/env';
import type { AIProvider, AIRequest, AIResponse, AIToolDefinition } from '../types';

function toolsToOpenAI(tools: AIToolDefinition[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

async function callOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  body: unknown,
) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as any;
}

function makeProvider(name: string, baseUrl: string): AIProvider {
  return {
    name,
    async send(req: AIRequest): Promise<AIResponse> {
      if (!env.AI_API_KEY) throw new Error(`${name} provider requires AI_API_KEY`);
      const messages = req.messages.map((m) => ({
        role: m.role === 'tool' ? 'tool' : m.role,
        content: m.content,
        tool_call_id: m.toolCallId,
        name: m.toolName,
      }));
      const tools = req.tools ?? [];
      const toolCallsCollected: AIResponse['toolCalls'] = [];

      let response = await callOpenAI(baseUrl, env.AI_API_KEY, env.AI_MODEL, {
        model: env.AI_MODEL,
        messages,
        tools: tools.length ? toolsToOpenAI(tools) : undefined,
        tool_choice: tools.length ? 'auto' : undefined,
      });

      // Loop up to 4 tool invocations
      for (let i = 0; i < 4; i++) {
        const choice = response.choices?.[0];
        const message = choice?.message;
        if (!message) break;
        const calls = message.tool_calls;
        if (!calls || calls.length === 0) {
          return {
            reply: message.content ?? '',
            toolCalls: toolCallsCollected,
          };
        }
        messages.push({ ...message });
        for (const call of calls) {
          const def = tools.find((t) => t.name === call.function.name);
          let result: unknown;
          try {
            const args = JSON.parse(call.function.arguments || '{}');
            result = def ? await def.handler(args) : { error: 'unknown tool' };
            toolCallsCollected!.push({ name: call.function.name, args, result });
          } catch (err) {
            result = { error: String(err) };
          }
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          } as any);
        }
        response = await callOpenAI(baseUrl, env.AI_API_KEY, env.AI_MODEL, {
          model: env.AI_MODEL,
          messages,
          tools: toolsToOpenAI(tools),
        });
      }
      return {
        reply: response.choices?.[0]?.message?.content ?? '',
        toolCalls: toolCallsCollected,
      };
    },
  };
}

export const OpenAIProvider: AIProvider = makeProvider(
  'openai',
  'https://api.openai.com/v1',
);
export const OpenRouterProvider: AIProvider = makeProvider(
  'openrouter',
  'https://openrouter.ai/api/v1',
);
