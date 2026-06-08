import type { Store } from '@/lib/types';
import { sb } from './base';

export const StoresRepo = {
  async list(): Promise<Store[]> {
    const { data, error } = await sb()
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Store[];
  },

  async create(input: { name: string; store_type: string; currency?: string }): Promise<Store> {
    const user = (await sb().auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await sb()
      .from('stores')
      .insert({
        name: input.name,
        store_type: input.store_type,
        currency: input.currency ?? 'EGP',
        owner_id: user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Store;
  },

  async update(id: string, patch: Partial<Store>): Promise<Store> {
    const { data, error } = await sb()
      .from('stores')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Store;
  },

  async remove(id: string): Promise<void> {
    const { error } = await sb().from('stores').delete().eq('id', id);
    if (error) throw error;
  },

  async seedDemo(): Promise<string> {
    const { data, error } = await sb().rpc('seed_demo_store');
    if (error) throw error;
    return data as string;
  },
};
