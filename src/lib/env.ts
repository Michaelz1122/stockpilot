import Constants from 'expo-constants';

const extra = (Constants?.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const env = {
  SUPABASE_URL:
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '',
  SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '',
  AI_PROVIDER:
    process.env.EXPO_PUBLIC_AI_PROVIDER ?? extra.aiProvider ?? 'local',
  AI_API_KEY: process.env.EXPO_PUBLIC_AI_API_KEY ?? extra.aiApiKey ?? '',
  AI_MODEL:
    process.env.EXPO_PUBLIC_AI_MODEL ?? extra.aiModel ?? 'gpt-4o-mini',
};

export const isSupabaseConfigured = () =>
  env.SUPABASE_URL.length > 0 && env.SUPABASE_ANON_KEY.length > 0;
