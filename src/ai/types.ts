export type AIRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AIMessage {
  role: AIRole;
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface AIContext {
  storeId: string;
  lang: 'ar' | 'en';
}

export interface AIRequest {
  messages: AIMessage[];
  tools?: AIToolDefinition[];
  context: AIContext;
  model?: string;
}

export interface AIResponse {
  reply: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
}

export interface AIProvider {
  readonly name: string;
  send(req: AIRequest): Promise<AIResponse>;
}

export interface AttachedFileForAI {
  name: string;
  hasHeaders: boolean;
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface ToolBuildOptions {
  lang: 'ar' | 'en';
  t: (key: string, params?: Record<string, unknown>) => string;
  attachedFile?: AttachedFileForAI | null;
}
