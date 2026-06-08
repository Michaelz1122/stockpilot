import type { Customer } from '@/lib/types';
import { sb } from './base';

export const CustomersRepo = {
  async list(storeId: string): Promise<Customer[]> {
    const [{ data: rows, error }, balances] = await Promise.all([
      sb().from('customers').select('*').eq('store_id', storeId).order('name'),
      sb().from('v_customer_balance').select('customer_id, balance').eq('store_id', storeId),
    ]);
    if (error) throw error;
    const map: Record<string, number> = {};
    (balances.data ?? []).forEach((b: any) => {
      if (b.customer_id) map[b.customer_id] = Number(b.balance ?? 0);
    });
    return (rows ?? []).map((c: any) => ({
      ...c,
      balance: map[c.id] ?? Number(c.opening_balance ?? 0),
    })) as Customer[];
  },

  async search(storeId: string, q: string): Promise<Customer[]> {
    const { data, error } = await sb().rpc('search_customers', {
      p_store_id: storeId,
      p_query: q,
    });
    if (error) throw error;
    return (data ?? []) as Customer[];
  },

  async get(id: string): Promise<Customer | null> {
    const { data, error } = await sb()
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Customer | null;
  },

  async create(storeId: string, input: Partial<Customer>): Promise<Customer> {
    const { data, error } = await sb()
      .from('customers')
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
    return data as Customer;
  },

  async update(id: string, patch: Partial<Customer>): Promise<Customer> {
    const { balance: _b, search_blob: _s, ...rest } = patch as any;
    const { data, error } = await sb()
      .from('customers')
      .update(rest)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  },

  async remove(id: string): Promise<void> {
    const { error } = await sb().from('customers').delete().eq('id', id);
    if (error) throw error;
  },

  async bulkInsert(storeId: string, rows: Array<Partial<Customer>>): Promise<number> {
    if (rows.length === 0) return 0;
    const payload = rows.map((r) => ({
      store_id: storeId,
      name: r.name ?? '',
      phone: r.phone ?? null,
      address: r.address ?? null,
      notes: r.notes ?? null,
      opening_balance: Number(r.opening_balance ?? 0),
    }));
    const { error, data } = await sb().from('customers').insert(payload).select('id');
    if (error) throw error;
    return data?.length ?? 0;
  },
};
