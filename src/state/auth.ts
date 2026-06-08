import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  ready: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  session: null,
  ready: false,
  init: async () => {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      ready: true,
    });
    sb.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },
  signIn: async (email, password) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  signUp: async (email, password) => {
    const { error } = await getSupabase().auth.signUp({ email, password });
    if (error) throw error;
  },
  signOut: async () => {
    await getSupabase().auth.signOut();
    set({ user: null, session: null });
  },
}));
