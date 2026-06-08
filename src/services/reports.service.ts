import { CustomersRepo } from '@/repositories/customers.repo';
import { ProductsRepo } from '@/repositories/products.repo';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { sb } from '@/repositories/base';
import type { Product } from '@/lib/types';

export interface DashboardSummary {
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  revenue30d: number;
  profit30d: number;
  salesTrend: Array<{ day: string; sales: number; profit: number }>;
}

export const ReportsService = {
  async dashboard(storeId: string): Promise<DashboardSummary> {
    const { data, error } = await sb().rpc('dashboard_summary', { p_store_id: storeId });
    if (error) throw error;
    const d = (data ?? {}) as any;
    return {
      totalProducts: Number(d.totalProducts ?? 0),
      totalCustomers: Number(d.totalCustomers ?? 0),
      totalSuppliers: Number(d.totalSuppliers ?? 0),
      inventoryValue: Number(d.inventoryValue ?? 0),
      lowStockCount: Number(d.lowStockCount ?? 0),
      outOfStockCount: Number(d.outOfStockCount ?? 0),
      revenue30d: Number(d.revenue30d ?? 0),
      profit30d: Number(d.profit30d ?? 0),
      salesTrend: (d.salesTrend ?? []).map((r: any) => ({
        day: r.day,
        sales: Number(r.sales),
        profit: Number(r.profit ?? 0),
      })),
    };
  },

  async lowStock(storeId: string): Promise<Product[]> {
    const { data, error } = await sb().rpc('low_stock', { p_store_id: storeId });
    if (error) throw error;
    return ((data ?? []) as any[]).map((r) => ({
      id: r.id,
      store_id: storeId,
      name: r.name,
      sku: r.sku ?? null,
      minimum_stock: Number(r.minimum_stock),
      current_stock: Number(r.current_stock),
      purchase_price: 0,
      sale_price: 0,
      created_at: '',
      updated_at: '',
    })) as Product[];
  },

  async outOfStock(storeId: string): Promise<Product[]> {
    const products = await ProductsRepo.list(storeId);
    return products.filter((p) => Number(p.current_stock ?? 0) <= 0);
  },

  async topCustomers(storeId: string, limit = 5) {
    const { data, error } = await sb().rpc('top_customers', {
      p_store_id: storeId,
      p_limit: limit,
    });
    if (error) throw error;
    return ((data ?? []) as any[]).map((r) => ({
      customer: {
        id: r.customer_id,
        name: r.customer_name,
        phone: r.phone,
        store_id: storeId,
        opening_balance: 0,
        created_at: '',
        updated_at: '',
      },
      total: Number(r.total),
    }));
  },

  async salesByPeriod(
    storeId: string,
    period: 'day' | 'week' | 'month' | 'year',
  ): Promise<Array<{ key: string; total: number }>> {
    const { data, error } = await sb().rpc('sales_by_period', {
      p_store_id: storeId,
      p_period: period,
    });
    if (error) throw error;
    return ((data ?? []) as any[]).map((r) => ({ key: r.key, total: Number(r.total) }));
  },

  async outstandingCustomers(storeId: string) {
    const customers = await CustomersRepo.list(storeId);
    return customers
      .filter((c) => Number(c.balance ?? 0) > 0)
      .sort((a, b) => Number(b.balance) - Number(a.balance));
  },

  async outstandingSuppliers(storeId: string) {
    const suppliers = await SuppliersRepo.list(storeId);
    return suppliers
      .filter((s) => Number(s.balance ?? 0) > 0)
      .sort((a, b) => Number(b.balance) - Number(a.balance));
  },

  async inventoryValue(storeId: string) {
    const products = await ProductsRepo.list(storeId);
    return products.reduce(
      (acc, p) => acc + Number(p.current_stock ?? 0) * Number(p.purchase_price),
      0,
    );
  },
};
