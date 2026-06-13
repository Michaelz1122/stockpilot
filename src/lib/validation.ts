import { z } from 'zod';

export const storeSchema = z.object({
  name: z.string().min(1, 'Required').max(120),
  store_type: z.string().min(1, 'Required').max(80),
  currency: z.string().min(1).max(8).default('EGP'),
});
export type StoreInput = z.infer<typeof storeSchema>;

const num = (def = 0) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? def : Number(v)),
    z.number().nonnegative(),
  );

export const productSchema = z.object({
  name: z.string().min(1, 'Required').max(200),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  purchase_price: num(0),
  sale_price: num(0),
  minimum_stock: num(0),
  opening_stock: num(0),
});
export type ProductInput = z.infer<typeof productSchema>;

export const customerSchema = z.object({
  name: z.string().min(1, 'Required'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  opening_balance: num(0),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const supplierSchema = z.object({
  name: z.string().min(1, 'Required'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  opening_balance: num(0),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const inventoryTxSchema = z.object({
  product_id: z.string().uuid(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.preprocess((v) => Number(v), z.number()),
  unit_cost: num(0),
  note: z.string().optional().nullable(),
});
export type InventoryTxInput = z.infer<typeof inventoryTxSchema>;

export const invoiceItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.preprocess((v) => Number(v), z.number().positive()),
  unit_price: num(0),
  unit_cost: num(0),
  discount: num(0),
});

export const salesInvoiceSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  invoice_number: z.string().optional().nullable(),
  discount: num(0),
  paid: num(0),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one product'),
});
export type SalesInvoiceInput = z.infer<typeof salesInvoiceSchema>;

export const purchaseInvoiceSchema = z.object({
  supplier_id: z.string().uuid().nullable().optional(),
  invoice_number: z.string().optional().nullable(),
  discount: num(0),
  paid: num(0),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one product'),
});
export type PurchaseInvoiceInput = z.infer<typeof purchaseInvoiceSchema>;
