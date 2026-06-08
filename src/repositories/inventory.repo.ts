import type { InventoryTransaction, InventoryTxType } from '@/lib/types';
import { sb } from './base';

export const InventoryRepo = {
  async list(storeId: string, productId?: string): Promise<InventoryTransaction[]> {
    let q = sb()
      .from('inventory_transactions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (productId) q = q.eq('product_id', productId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as InventoryTransaction[];
  },

  async create(
    storeId: string,
    input: {
      product_id: string;
      type: InventoryTxType;
      quantity: number;
      unit_cost?: number;
      note?: string | null;
    },
  ): Promise<InventoryTransaction> {
    const { data, error } = await sb()
      .from('inventory_transactions')
      .insert({
        store_id: storeId,
        product_id: input.product_id,
        type: input.type,
        quantity:
          input.type === 'ADJUSTMENT'
            ? Number(input.quantity)
            : Math.abs(Number(input.quantity)),
        unit_cost: Number(input.unit_cost ?? 0),
        reference_type: 'manual',
        reference_id: null,
        note: input.note ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as InventoryTransaction;
  },

  async stockByProduct(storeId: string): Promise<Record<string, number>> {
    const { data, error } = await sb()
      .from('v_product_stock')
      .select('product_id, current_stock')
      .eq('store_id', storeId);
    if (error) throw error;
    const m: Record<string, number> = {};
    (data ?? []).forEach((r: any) => {
      if (r.product_id) m[r.product_id] = Number(r.current_stock ?? 0);
    });
    return m;
  },
};
