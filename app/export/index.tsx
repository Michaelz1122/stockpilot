import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { ListItem } from '@/components/ui/ListItem';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { ExcelService } from '@/services/excel.service';
import { ProductsRepo } from '@/repositories/products.repo';
import { CustomersRepo } from '@/repositories/customers.repo';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { InventoryRepo } from '@/repositories/inventory.repo';
import { SalesRepo } from '@/repositories/sales.repo';
import { PurchasesRepo } from '@/repositories/purchases.repo';

export default function ExportScreen() {
  const { t } = useLocale();
  const { storeId, store } = useActiveStore();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (
    name: string,
    fn: () => Promise<Record<string, unknown>[]>,
    file: string,
  ) => {
    if (!storeId) return;
    setBusy(name);
    try {
      const rows = await fn();
      await ExcelService.exportToFile(file, rows, name);
    } catch (e: any) {
      Alert.alert(t('export.failed'), e?.message ?? '');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen padded>
      <Header title={t('export.title')} subtitle={store?.name} showBack />
      <Text className="mb-2 text-sm text-muted-foreground">{t('export.description')}</Text>
      <ListItem
        title={busy === 'products' ? t('export.exporting', { name: t('export.products') }) : t('export.products')}
        subtitle={t('export.productsHint')}
        leadingIcon="cube"
        onPress={() =>
          run(
            'products',
            async () => {
              const list = await ProductsRepo.list(storeId!);
              return list.map((p) => ({
                name: p.name,
                sku: p.sku ?? '',
                barcode: p.barcode ?? '',
                category: p.category ?? '',
                purchase_price: p.purchase_price,
                sale_price: p.sale_price,
                minimum_stock: p.minimum_stock,
                current_stock: p.current_stock ?? 0,
              }));
            },
            'products.xlsx',
          )
        }
      />
      <ListItem
        title={t('export.customers')}
        leadingIcon="people"
        onPress={() =>
          run(
            'customers',
            async () => {
              const list = await CustomersRepo.list(storeId!);
              return list.map((c) => ({
                name: c.name,
                phone: c.phone ?? '',
                address: c.address ?? '',
                balance: c.balance ?? 0,
              }));
            },
            'customers.xlsx',
          )
        }
      />
      <ListItem
        title={t('export.suppliers')}
        leadingIcon="business"
        onPress={() =>
          run(
            'suppliers',
            async () => {
              const list = await SuppliersRepo.list(storeId!);
              return list.map((s) => ({
                name: s.name,
                phone: s.phone ?? '',
                address: s.address ?? '',
                balance: s.balance ?? 0,
              }));
            },
            'suppliers.xlsx',
          )
        }
      />
      <ListItem
        title={t('export.inventory')}
        leadingIcon="swap-vertical"
        onPress={() =>
          run(
            'inventory',
            async () => {
              const list = await InventoryRepo.list(storeId!);
              return list.map((tx) => ({
                date: tx.created_at,
                product_id: tx.product_id,
                type: tx.type,
                quantity: tx.quantity,
                unit_cost: tx.unit_cost,
                note: tx.note ?? '',
              }));
            },
            'inventory.xlsx',
          )
        }
      />
      <ListItem
        title={t('export.sales')}
        leadingIcon="document-text"
        onPress={() =>
          run(
            'sales',
            async () => {
              const list = await SalesRepo.list(storeId!);
              return list.map((s) => ({
                invoice_number: s.invoice_number ?? s.id,
                date: s.invoice_date,
                customer_id: s.customer_id ?? '',
                subtotal: s.subtotal,
                discount: s.discount,
                total: s.total,
                paid: s.paid,
              }));
            },
            'sales.xlsx',
          )
        }
      />
      <ListItem
        title={t('export.purchases')}
        leadingIcon="document-text"
        onPress={() =>
          run(
            'purchases',
            async () => {
              const list = await PurchasesRepo.list(storeId!);
              return list.map((p) => ({
                invoice_number: p.invoice_number ?? p.id,
                date: p.invoice_date,
                supplier_id: p.supplier_id ?? '',
                subtotal: p.subtotal,
                discount: p.discount,
                total: p.total,
                paid: p.paid,
              }));
            },
            'purchases.xlsx',
          )
        }
      />
    </Screen>
  );
}
