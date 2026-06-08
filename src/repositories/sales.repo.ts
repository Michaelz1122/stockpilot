import type { SalesInvoice, SalesInvoiceItem } from '@/lib/types';
import type { SalesInvoiceInput } from '@/lib/validation';
import { sb } from './base';

export interface FullSalesInvoice extends SalesInvoice {
  items: SalesInvoiceItem[];
}

export const SalesRepo = {
  async list(storeId: string): Promise<SalesInvoice[]> {
    const { data, error } = await sb()
      .from('sales_invoices')
      .select('*')
      .eq('store_id', storeId)
      .order('invoice_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as SalesInvoice[];
  },

  async get(id: string): Promise<FullSalesInvoice | null> {
    const { data: inv, error } = await sb()
      .from('sales_invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!inv) return null;
    const { data: items, error: e2 } = await sb()
      .from('sales_invoice_items')
      .select('*')
      .eq('invoice_id', id);
    if (e2) throw e2;
    return { ...(inv as SalesInvoice), items: (items ?? []) as SalesInvoiceItem[] };
  },

  async create(storeId: string, input: SalesInvoiceInput): Promise<FullSalesInvoice> {
    const { data: invId, error } = await sb().rpc('create_sale_invoice', {
      p_store_id: storeId,
      p_customer_id: input.customer_id ?? null,
      p_invoice_number: input.invoice_number ?? null,
      p_discount: Number(input.discount ?? 0),
      p_paid: Number(input.paid ?? 0),
      p_notes: input.notes ?? null,
      p_items: input.items as any,
    });
    if (error) throw error;
    const full = await SalesRepo.get(String(invId));
    if (!full) throw new Error('Invoice created but not retrievable');
    return full;
  },

  async remove(id: string): Promise<void> {
    const { error } = await sb().from('sales_invoices').delete().eq('id', id);
    if (error) throw error;
  },
};
