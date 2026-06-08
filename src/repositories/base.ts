import { getSupabase } from '@/lib/supabase';

export function sb() {
  return getSupabase();
}
