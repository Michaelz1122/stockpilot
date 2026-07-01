import { getSupabase } from '@/lib/supabase';

export interface Payment {
  id: string;
  store_id: string;
  customer_id?: string | null;
  supplier_id?: string | null;
  direction: 'IN' | 'OUT';
  amount: number;
  payment_date: string;
  notes?: string | null;
  created_at: string;
}

export const PaymentsRepo = {
  async list(storeId: string): Promise<Payment[]> {
    const { data, error } = await (getSupabase() as any)
      .from('payments')
      .select('*').limit(100000)
      .eq('store_id', storeId)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async get(id: string): Promise<Payment> {
    const { data, error } = await (getSupabase() as any)
      .from('payments')
      .select('*').limit(100000)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(payload: Partial<Payment>): Promise<Payment> {
    const { data, error } = await (getSupabase() as any)
      .from('payments')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await (getSupabase() as any).from('payments').delete().eq('id', id);
    if (error) throw error;
  },
};

