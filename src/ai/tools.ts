import { CustomersRepo } from '@/repositories/customers.repo';
import { ProductsRepo } from '@/repositories/products.repo';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { InventoryRepo } from '@/repositories/inventory.repo';
import { SalesRepo } from '@/repositories/sales.repo';
import { ReportsService } from '@/services/reports.service';
import { matchesAny } from '@/lib/arabic';
import type { AIToolDefinition, ToolBuildOptions } from './types';

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const cleaned = String(v).replace(/[,٬]/g, '').trim();
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}

function toStr(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

export function buildTools(
  storeId: string,
  opts?: ToolBuildOptions,
): AIToolDefinition[] {
  const attached = opts?.attachedFile ?? null;
  return [
    // ============================================
    // READ — search & list
    // ============================================
    {
      name: 'find_product',
      description:
        'Search products in the active store by name (Arabic or English), sku, or barcode. Returns matching products with current stock.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      handler: async (args) => {
        const q = String(args.query ?? '');
        const products = await ProductsRepo.list(storeId);
        return products
          .filter((p) =>
            matchesAny([p.name, p.sku, p.barcode, p.category, p.description], q),
          )
          .slice(0, 10);
      },
    },
    {
      name: 'find_customer',
      description:
        'Find a customer by name or phone (Arabic or English). Returns customer with current balance.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      handler: async (args) => {
        const q = String(args.query ?? '');
        const customers = await CustomersRepo.list(storeId);
        return customers
          .filter((c) => matchesAny([c.name, c.phone, c.address], q))
          .slice(0, 10);
      },
    },
    {
      name: 'find_supplier',
      description: 'Find a supplier by name or phone (Arabic or English).',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      handler: async (args) => {
        const q = String(args.query ?? '');
        const suppliers = await SuppliersRepo.list(storeId);
        return suppliers
          .filter((s) => matchesAny([s.name, s.phone, s.address], q))
          .slice(0, 10);
      },
    },
    {
      name: 'low_stock',
      description: 'List products at or below their minimum stock threshold.',
      parameters: { type: 'object', properties: {} },
      handler: async () => ReportsService.lowStock(storeId),
    },
    {
      name: 'top_customers',
      description: 'Return the top customers by total revenue.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
      handler: async (args) =>
        ReportsService.topCustomers(storeId, Number(args.limit ?? 5)),
    },
    {
      name: 'sales_today',
      description: 'Compute total sales for today.',
      parameters: { type: 'object', properties: {} },
      handler: async () => {
        const sales = await SalesRepo.list(storeId);
        const today = new Date().toISOString().slice(0, 10);
        const filtered = sales.filter((s) => s.invoice_date.slice(0, 10) === today);
        return {
          count: filtered.length,
          total: filtered.reduce((acc, s) => acc + Number(s.total), 0),
        };
      },
    },
    {
      name: 'dashboard_summary',
      description: 'Return the dashboard KPI summary.',
      parameters: { type: 'object', properties: {} },
      handler: async () => ReportsService.dashboard(storeId),
    },

    // ============================================
    // WRITE — create
    // ============================================
    {
      name: 'add_customer',
      description:
        'Create a new customer in the active store. Returns the new customer record. Use this when the user asks to add/create a customer.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Customer full name (Arabic or English).' },
          phone: { type: 'string' },
          address: { type: 'string' },
          opening_balance: { type: 'number', description: 'Amount they owe at creation. Default 0.' },
          notes: { type: 'string' },
        },
        required: ['name'],
      },
      handler: async (args) => {
        const c = await CustomersRepo.create(storeId, {
          name: String(args.name),
          phone: args.phone ? String(args.phone) : null,
          address: args.address ? String(args.address) : null,
          notes: args.notes ? String(args.notes) : null,
          opening_balance: Number(args.opening_balance ?? 0),
        });
        return { ok: true, id: c.id, name: c.name };
      },
    },
    {
      name: 'add_supplier',
      description:
        'Create a new supplier in the active store. Use this when the user asks to add/create a supplier.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          opening_balance: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['name'],
      },
      handler: async (args) => {
        const s = await SuppliersRepo.create(storeId, {
          name: String(args.name),
          phone: args.phone ? String(args.phone) : null,
          address: args.address ? String(args.address) : null,
          notes: args.notes ? String(args.notes) : null,
          opening_balance: Number(args.opening_balance ?? 0),
        });
        return { ok: true, id: s.id, name: s.name };
      },
    },
    {
      name: 'add_product',
      description:
        'Create a new product in the active store. Use this when the user asks to add/create a product or item.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          sku: { type: 'string' },
          barcode: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          purchase_price: { type: 'number' },
          sale_price: { type: 'number' },
          minimum_stock: { type: 'number' },
        },
        required: ['name'],
      },
      handler: async (args) => {
        const p = await ProductsRepo.create(storeId, {
          name: String(args.name),
          sku: args.sku ? String(args.sku) : null,
          barcode: args.barcode ? String(args.barcode) : null,
          category: args.category ? String(args.category) : null,
          description: args.description ? String(args.description) : null,
          purchase_price: Number(args.purchase_price ?? 0),
          sale_price: Number(args.sale_price ?? 0),
          minimum_stock: Number(args.minimum_stock ?? 0),
        });
        return { ok: true, id: p.id, name: p.name };
      },
    },

    // ============================================
    // WRITE — update
    // ============================================
    {
      name: 'update_product',
      description:
        'Update an existing product. Look up the product first with find_product to get the product_id. Only pass fields you want to change.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          name: { type: 'string' },
          sku: { type: 'string' },
          category: { type: 'string' },
          sale_price: { type: 'number' },
          purchase_price: { type: 'number' },
          minimum_stock: { type: 'number' },
        },
        required: ['product_id'],
      },
      handler: async (args) => {
        const { product_id, ...patch } = args as any;
        const cleaned: any = {};
        for (const k of Object.keys(patch)) {
          if (patch[k] !== undefined && patch[k] !== null && patch[k] !== '') {
            cleaned[k] = patch[k];
          }
        }
        const updated = await ProductsRepo.update(String(product_id), cleaned);
        return { ok: true, id: updated.id, name: updated.name };
      },
    },
    {
      name: 'update_customer',
      description: 'Update an existing customer. Look up first to get customer_id.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
          name: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          opening_balance: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['customer_id'],
      },
      handler: async (args) => {
        const { customer_id, ...patch } = args as any;
        const updated = await CustomersRepo.update(String(customer_id), patch);
        return { ok: true, id: updated.id, name: updated.name };
      },
    },

    // ============================================
    // WRITE — inventory
    // ============================================
    {
      name: 'record_inventory_movement',
      description:
        'Record a stock movement: IN (purchase/restock), OUT (sale/loss), ADJUSTMENT (set new quantity). Look up product first.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          type: {
            type: 'string',
            enum: ['IN', 'OUT', 'ADJUSTMENT'],
            description: 'IN for incoming stock, OUT for outgoing, ADJUSTMENT for stocktake.',
          },
          quantity: { type: 'number' },
          unit_cost: { type: 'number' },
          note: { type: 'string' },
        },
        required: ['product_id', 'type', 'quantity'],
      },
      handler: async (args) => {
        const tx = await InventoryRepo.create(storeId, {
          product_id: String(args.product_id),
          type: args.type as any,
          quantity: Number(args.quantity),
          unit_cost: args.unit_cost !== undefined ? Number(args.unit_cost) : undefined,
          note: args.note ? String(args.note) : null,
        });
        return { ok: true, id: tx.id, type: tx.type, quantity: tx.quantity };
      },
    },

    // ============================================
    // BULK — for file imports via chat
    // ============================================
    {
      name: 'bulk_add_customers',
      description:
        'Add many customers at once. Use this after parsing attached file data. Pass an array of customer objects.',
      parameters: {
        type: 'object',
        properties: {
          customers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                opening_balance: { type: 'number' },
              },
              required: ['name'],
            },
          },
        },
        required: ['customers'],
      },
      handler: async (args) => {
        const list = Array.isArray(args.customers) ? args.customers : [];
        const n = await CustomersRepo.bulkInsert(storeId, list as any);
        return { ok: true, added: n };
      },
    },
    {
      name: 'bulk_add_products',
      description: 'Add many products at once from attached file data.',
      parameters: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                sku: { type: 'string' },
                category: { type: 'string' },
                purchase_price: { type: 'number' },
                sale_price: { type: 'number' },
                minimum_stock: { type: 'number' },
              },
              required: ['name'],
            },
          },
        },
        required: ['products'],
      },
      handler: async (args) => {
        const list = Array.isArray(args.products) ? args.products : [];
        const n = await ProductsRepo.bulkInsert(storeId, list as any);
        return { ok: true, added: n };
      },
    },
    {
      name: 'bulk_add_suppliers',
      description: 'Add many suppliers at once from attached file data.',
      parameters: {
        type: 'object',
        properties: {
          suppliers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                opening_balance: { type: 'number' },
              },
              required: ['name'],
            },
          },
        },
        required: ['suppliers'],
      },
      handler: async (args) => {
        const list = Array.isArray(args.suppliers) ? args.suppliers : [];
        const n = await SuppliersRepo.bulkInsert(storeId, list as any);
        return { ok: true, added: n };
      },
    },

    // ============================================
    // BULK — import the FULL attached file (no row truncation)
    // ============================================
    {
      name: 'import_attached_file_as',
      description:
        'Import EVERY row from the file the user attached. Use this for files with many rows (>20). You only specify the entity type and which source column maps to each target field — the app reads the full file from device memory and bulk-inserts. ALWAYS prefer this over bulk_add_* for attached files.',
      parameters: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            enum: ['products', 'customers', 'suppliers'],
            description: 'What kind of records the file contains.',
          },
          mapping: {
            type: 'object',
            description:
              'Map target fields to source column names from the attached file. Only include fields that exist in the file.',
            properties: {
              name: { type: 'string' },
              sku: { type: 'string' },
              barcode: { type: 'string' },
              category: { type: 'string' },
              description: { type: 'string' },
              purchase_price: { type: 'string' },
              sale_price: { type: 'string' },
              minimum_stock: { type: 'string' },
              opening_stock: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'string' },
              notes: { type: 'string' },
              opening_balance: { type: 'string' },
            },
          },
          skip_first_row: {
            type: 'boolean',
            description:
              'Set true if the first row of the file is a title/header line that should be skipped.',
          },
        },
        required: ['entity', 'mapping'],
      },
      handler: async (args) => {
        if (!attached || attached.rows.length === 0) {
          return { error: 'No file is currently attached.' };
        }
        const map = (args.mapping ?? {}) as Record<string, string>;
        const nameCol = map.name;
        if (!nameCol) {
          return { error: 'mapping.name is required' };
        }
        const skip = !!args.skip_first_row;
        const sourceRows = skip ? attached.rows.slice(1) : attached.rows;

        const transformed = sourceRows
          .map((row) => {
            const name = toStr(row[nameCol]);
            if (!name) return null;
            const base: any = { name };
            if (map.sku) base.sku = toStr(row[map.sku]) || null;
            if (map.barcode) base.barcode = toStr(row[map.barcode]) || null;
            if (map.category) base.category = toStr(row[map.category]) || null;
            if (map.description) base.description = toStr(row[map.description]) || null;
            if (map.purchase_price) base.purchase_price = toNum(row[map.purchase_price]);
            if (map.sale_price) base.sale_price = toNum(row[map.sale_price]);
            if (map.minimum_stock) base.minimum_stock = toNum(row[map.minimum_stock]);
            if (map.phone) base.phone = toStr(row[map.phone]) || null;
            if (map.address) base.address = toStr(row[map.address]) || null;
            if (map.notes) base.notes = toStr(row[map.notes]) || null;
            if (map.opening_balance) base.opening_balance = toNum(row[map.opening_balance]);
            // opening_stock handled below for products
            return base;
          })
          .filter(Boolean) as any[];

        if (transformed.length === 0) {
          return { error: 'No valid rows found after applying the mapping.' };
        }

        const entity = args.entity as 'products' | 'customers' | 'suppliers';
        let added = 0;
        if (entity === 'products') {
          added = await ProductsRepo.bulkInsert(storeId, transformed);
          // If the file included an opening stock column, record inventory IN for each
          if (map.opening_stock) {
            // Re-fetch to get IDs by SKU/name (best effort)
            try {
              const all = await ProductsRepo.list(storeId);
              const byName = new Map(all.map((p) => [p.name, p.id]));
              for (let i = 0; i < sourceRows.length; i++) {
                const row = sourceRows[i];
                const name = toStr(row[nameCol]);
                const qty = toNum(row[map.opening_stock]);
                if (!name || qty <= 0) continue;
                const productId = byName.get(name);
                if (!productId) continue;
                await InventoryRepo.create(storeId, {
                  product_id: productId,
                  type: 'IN',
                  quantity: qty,
                  note: 'Opening stock from attached file',
                });
              }
            } catch {
              // non-fatal
            }
          }
        } else if (entity === 'customers') {
          added = await CustomersRepo.bulkInsert(storeId, transformed);
        } else if (entity === 'suppliers') {
          added = await SuppliersRepo.bulkInsert(storeId, transformed);
        }

        return {
          ok: true,
          entity,
          added,
          total_rows_in_file: attached.rows.length,
          rows_after_skip: sourceRows.length,
        };
      },
    },
  ];
}
