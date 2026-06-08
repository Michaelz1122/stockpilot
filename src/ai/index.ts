import { env } from '@/lib/env';
import { LocalProvider } from './providers/local';
import { OpenAIProvider, OpenRouterProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
import type { AIProvider } from './types';

const REGISTRY: Record<string, AIProvider> = {
  local: LocalProvider,
  openai: OpenAIProvider,
  openrouter: OpenRouterProvider,
  gemini: GeminiProvider,
  google: GeminiProvider, // alias
};

export function getAIProvider(name?: string): AIProvider {
  const id = (name ?? env.AI_PROVIDER ?? 'local').toLowerCase();
  return REGISTRY[id] ?? LocalProvider;
}

export function registerAIProvider(name: string, provider: AIProvider) {
  REGISTRY[name.toLowerCase()] = provider;
}

export type { AIProvider, AIMessage, AIRequest, AIResponse } from './types';
