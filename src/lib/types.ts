export type UUID = string;

export type StoreType =
  | 'electrical'
  | 'spare_parts'
  | 'grocery'
  | 'pharmacy'
  | 'general'
  | string;

export interface Store {
  id: UUID;
  owner_id: UUID;
  name: string;
  store_type: StoreType;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface ProductUnit {
  id: UUID;
  product_id: UUID;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: UUID;
  store_id: UUID;
  name: string;
  description?: string | null;
  category?: string | null;
  barcode?: string | null;
  sku?: string | null;
  purchase_price: number;
  sale_price: number;
  minimum_stock: number;
  current_stock?: number;
  is_favorite?: boolean;
  recently_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: UUID;
  store_id: UUID;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  opening_balance: number;
  balance?: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: UUID;
  store_id: UUID;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  opening_balance: number;
  balance?: number;
  created_at: string;
  updated_at: string;
}

export type InventoryTxType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface InventoryTransaction {
  id: UUID;
  store_id: UUID;
  product_id: UUID;
  unit_id?: UUID | null;
  type: InventoryTxType;
  quantity: number;
  unit_cost: number;
  reference_type?: string | null;
  reference_id?: UUID | null;
  note?: string | null;
  created_at: string;
}

export interface InvoiceItemInput {
  product_id: UUID;
  unit_id?: UUID | null;
  quantity: number;
  unit_price?: number;
  unit_cost?: number;
  discount?: number;
}

export interface SalesInvoice {
  id: UUID;
  store_id: UUID;
  customer_id?: UUID | null;
  invoice_number?: string | null;
  invoice_date: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  notes?: string | null;
  created_at: string;
  customers?: { name: string } | null;
}

export interface SalesInvoiceItem {
  id: UUID;
  invoice_id: UUID;
  product_id: UUID;
  unit_id?: UUID | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount: number;
  line_total: number;
}

export interface PurchaseInvoice {
  id: UUID;
  store_id: UUID;
  supplier_id?: UUID | null;
  invoice_number?: string | null;
  invoice_date: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  notes?: string | null;
  created_at: string;
  suppliers?: { name: string } | null;
}

export interface PurchaseInvoiceItem {
  id: UUID;
  invoice_id: UUID;
  product_id: UUID;
  unit_id?: UUID | null;
  quantity: number;
  unit_cost: number;
  discount: number;
  line_total: number;
}

