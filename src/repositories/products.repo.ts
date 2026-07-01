import type { Product, ProductUnit } from '@/lib/types';
import { sb } from './base';

export const ProductsRepo = {
  async list(storeId: string): Promise<Product[]> {
    const { data, error } = await sb()
      .from('v_product_with_stock')
      .select('*')
      .eq('store_id', storeId)
      .order('name');
    if (error) throw error;
    return (data ?? []).map((p: any) => ({
      ...p,
      current_stock: Number(p.current_stock ?? 0),
    })) as Product[];
  },

  async search(
    storeId: string,
    q: string,
    sortBy: string = 'relevance',
    limit?: number,
    offset?: number,
  ): Promise<Product[]> {
    const hasQuery = q && q.trim().length > 0;
    const finalLimit = hasQuery ? 1000 : (limit ?? 50);
    const finalOffset = hasQuery ? 0 : (offset ?? 0);

    const { data, error } = await sb().rpc('search_products', {
      p_store_id: storeId,
      p_query: q,
      p_sort_by: sortBy,
      p_limit: finalLimit,
      p_offset: finalOffset,
    });
    if (error) throw error;
    return (data ?? []) as unknown as Product[];
  },

  async get(id: string): Promise<Product | null> {
    const { data, error } = await sb()
      .from('v_product_with_stock')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Product | null;
  },

  async getUnits(productId: string): Promise<ProductUnit[]> {
    const { data, error } = await sb()
      .from('product_units')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as ProductUnit[];
  },

  async syncUnits(productId: string, unitNames: string[]): Promise<void> {
    if (!unitNames || unitNames.length === 0) return;
    
    // Simplistic sync: in a real app, you might want to delete missing units
    // but here we just insert missing ones ignoring duplicates.
    for (const name of unitNames) {
      if (!name.trim()) continue;
      const { error } = await sb()
        .from('product_units')
        .insert({ product_id: productId, name: name.trim() });
      // ignore unique constraint violation error (code 23505)
      if (error && error.code !== '23505') throw error;
    }
  },

  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    const { error } = await sb()
      .from('products')
      .update({ is_favorite: isFavorite })
      .eq('id', id);
    if (error) throw error;
  },

  async markRecentlyUsed(id: string): Promise<void> {
    const { error } = await sb()
      .from('products')
      .update({ recently_used_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async create(storeId: string, input: Partial<Product> & { opening_stock?: number, units?: string[] }): Promise<Product> {
    const { data, error } = await sb()
      .from('products')
      .insert({
        store_id: storeId,
        name: input.name ?? '',
        description: input.description ?? null,
        category: input.category ?? null,
        barcode: input.barcode ?? null,
        sku: input.sku ?? null,
        purchase_price: Number(input.purchase_price ?? 0),
        sale_price: Number(input.sale_price ?? 0),
        minimum_stock: Number(input.minimum_stock ?? 0),
        is_favorite: input.is_favorite ?? false,
      })
      .select()
      .single();
    if (error) throw error;

    if (input.opening_stock && input.opening_stock > 0) {
      const { error: invErr } = await sb()
        .from('inventory_transactions')
        .insert({
          store_id: storeId,
          product_id: data.id,
          type: 'IN',
          quantity: Number(input.opening_stock),
          unit_cost: Number(input.purchase_price ?? 0),
          note: 'رصيد افتتاحي (Opening Balance)',
        });
      if (invErr) throw invErr;
    }

    if (input.units && input.units.length > 0) {
      await this.syncUnits(data.id, input.units);
    }

    return data as Product;
  },

  async update(id: string, patch: Partial<Product> & { units?: string[] }): Promise<Product> {
    // strip computed columns and opening_stock (since it's not a table column)
    const { current_stock: _cs, search_blob: _sb, opening_stock: _os, units, ...rest } = patch as any;
    const { data, error } = await sb()
      .from('products')
      .update(rest)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    if (units) {
      await this.syncUnits(id, units);
    }

    return data as Product;
  },

  async remove(id: string): Promise<void> {
    const { error } = await sb().from('products').delete().eq('id', id);
    if (error) throw error;
  },

  async bulkInsert(storeId: string, rows: Array<Partial<Product>>): Promise<number> {
    if (rows.length === 0) return 0;
    const payload = rows.map((r) => ({
      store_id: storeId,
      name: r.name ?? '',
      description: r.description ?? null,
      category: r.category ?? null,
      barcode: r.barcode ?? null,
      sku: r.sku ?? null,
      purchase_price: Number(r.purchase_price ?? 0),
      sale_price: Number(r.sale_price ?? 0),
      minimum_stock: Number(r.minimum_stock ?? 0),
    }));
    const { error, data } = await sb().from('products').insert(payload).select('id');
    if (error) throw error;
    return data?.length ?? 0;
  },

  async merge(primaryId: string, secondaryId: string): Promise<void> {
    const { error } = await sb().rpc('merge_products' as any, {
      p_primary_id: primaryId,
      p_secondary_id: secondaryId,
    });
    if (error) throw error;
  },
};
