import type { PurchaseInvoice, PurchaseInvoiceItem } from '@/lib/types';
import type { PurchaseInvoiceInput } from '@/lib/validation';
import { sb } from './base';

export interface FullPurchaseInvoice extends PurchaseInvoice {
  items: PurchaseInvoiceItem[];
}

export const PurchasesRepo = {
  async list(storeId: string): Promise<PurchaseInvoice[]> {
    const { data, error } = await sb()
      .from('purchase_invoices')
      .select('*, suppliers(name)')
      .eq('store_id', storeId)
      .order('invoice_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PurchaseInvoice[];
  },

  async get(id: string): Promise<FullPurchaseInvoice | null> {
    const { data: inv, error } = await sb()
      .from('purchase_invoices')
      .select('*').limit(100000)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!inv) return null;
    const { data: items, error: e2 } = await sb()
      .from('purchase_invoice_items')
      .select('*').limit(100000)
      .eq('invoice_id', id);
    if (e2) throw e2;
    return {
      ...(inv as PurchaseInvoice),
      items: (items ?? []) as PurchaseInvoiceItem[],
    };
  },

  async create(storeId: string, input: PurchaseInvoiceInput): Promise<FullPurchaseInvoice> {
    const { data: invId, error } = await sb().rpc('create_purchase_invoice', {
      p_store_id: storeId,
      p_supplier_id: input.supplier_id ?? null,
      p_invoice_number: input.invoice_number ?? null,
      p_discount: Number(input.discount ?? 0),
      p_paid: Number(input.paid ?? 0),
      p_notes: input.notes ?? null,
      p_items: input.items as any,
    } as any);
    if (error) throw error;
    const full = await PurchasesRepo.get(String(invId));
    if (!full) throw new Error('Invoice created but not retrievable');
    return full;
  },

  async update(id: string, input: PurchaseInvoiceInput): Promise<FullPurchaseInvoice> {
    const { error } = await sb().rpc('update_purchase_invoice' as any, {
      p_invoice_id: id,
      p_supplier_id: input.supplier_id ?? null,
      p_invoice_number: input.invoice_number ?? null,
      p_discount: Number(input.discount ?? 0),
      p_paid: Number(input.paid ?? 0),
      p_notes: input.notes ?? null,
      p_items: input.items as any,
    });
    if (error) throw error;
    const full = await PurchasesRepo.get(id);
    if (!full) throw new Error('Invoice updated but not retrievable');
    return full;
  },

  async remove(id: string): Promise<void> {
    const { error } = await sb().from('purchase_invoices').delete().eq('id', id);
    if (error) throw error;
  },
};

