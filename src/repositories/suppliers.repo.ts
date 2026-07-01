import type { Supplier } from '@/lib/types';
import { sb } from './base';

export const SuppliersRepo = {
  async list(storeId: string): Promise<Supplier[]> {
    const [{ data: rows, error }, balances] = await Promise.all([
      sb().from('suppliers').select('*').eq('store_id', storeId).order('name'),
      sb().from('v_supplier_balance').select('supplier_id, balance').eq('store_id', storeId),
    ]);
    if (error) throw error;
    const map: Record<string, number> = {};
    (balances.data ?? []).forEach((b: any) => {
      if (b.supplier_id) map[b.supplier_id] = Number(b.balance ?? 0);
    });
    return (rows ?? []).map((s: any) => ({
      ...s,
      balance: map[s.id] ?? Number(s.opening_balance ?? 0),
    })) as Supplier[];
  },

  async search(storeId: string, q: string): Promise<Supplier[]> {
    const { data, error } = await sb().rpc('search_suppliers', {
      p_store_id: storeId,
      p_query: q,
    });
    if (error) throw error;
    return (data ?? []) as Supplier[];
  },

  async get(id: string): Promise<Supplier | null> {
    const { data, error } = await sb()
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Supplier | null;
  },

  async create(storeId: string, input: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await sb()
      .from('suppliers')
      .insert({
        store_id: storeId,
        name: input.name ?? '',
        phone: input.phone ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        opening_balance: Number(input.opening_balance ?? 0),
      })
      .select()
      .single();
    if (error) throw error;
    return data as Supplier;
  },

  async update(id: string, patch: Partial<Supplier>): Promise<Supplier> {
    const { balance: _b, search_blob: _s, ...rest } = patch as any;
    const { data, error } = await sb()
      .from('suppliers')
      .update(rest)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Supplier;
  },

  async remove(id: string): Promise<void> {
    const { error } = await sb().from('suppliers').delete().eq('id', id);
    if (error) throw error;
  },

  async bulkInsert(storeId: string, rows: Array<Partial<Supplier>>): Promise<number> {
    if (rows.length === 0) return 0;
    const payload = rows.map((r) => ({
      store_id: storeId,
      name: r.name ?? '',
      phone: r.phone ?? null,
      address: r.address ?? null,
      notes: r.notes ?? null,
      opening_balance: Number(r.opening_balance ?? 0),
    }));
    const { error, data } = await sb().from('suppliers').insert(payload).select('id');
    if (error) throw error;
    return data?.length ?? 0;
  },

  async merge(primaryId: string, secondaryId: string): Promise<void> {
    const { error } = await sb().rpc('merge_suppliers' as any, {
      p_primary_id: primaryId,
      p_secondary_id: secondaryId,
    });
    if (error) throw error;
  },
};
