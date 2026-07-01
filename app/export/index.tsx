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
              if (list.length === 0) throw new Error('لا توجد بيانات لتصديرها');
              return list.map((p) => ({
                'الاسم': p.name,
                'الكود': p.sku ?? '',
                'الباركود': p.barcode ?? '',
                'التصنيف': p.category ?? '',
                'سعر الشراء': p.purchase_price,
                'سعر البيع': p.sale_price,
                'الحد الأدنى': p.minimum_stock,
                'الرصيد': p.current_stock ?? 0,
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
              if (list.length === 0) throw new Error('لا توجد بيانات لتصديرها');
              return list.map((c) => ({
                'الاسم': c.name,
                'رقم الهاتف': c.phone ?? '',
                'العنوان': c.address ?? '',
                'الرصيد الافتتاحي': c.balance ?? 0,
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
              if (list.length === 0) throw new Error('لا توجد بيانات لتصديرها');
              return list.map((s) => ({
                'الاسم': s.name,
                'رقم الهاتف': s.phone ?? '',
                'العنوان': s.address ?? '',
                'الرصيد الافتتاحي': s.balance ?? 0,
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
              if (list.length === 0) throw new Error('لا توجد بيانات لتصديرها');
              return list.map((tx) => ({
                'التاريخ': tx.created_at,
                'معرف المنتج': tx.product_id,
                'نوع الحركة': tx.type,
                'الكمية': tx.quantity,
                'التكلفة': tx.unit_cost,
                'ملاحظات': tx.note ?? '',
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
              if (list.length === 0) throw new Error('لا توجد بيانات لتصديرها');
              return list.map((s) => ({
                'رقم الفاتورة': s.invoice_number ?? s.id,
                'التاريخ': s.invoice_date,
                'معرف العميل': s.customer_id ?? '',
                'المجموع الفرعي': s.subtotal,
                'الخصم': s.discount,
                'الإجمالي': s.total,
                'المدفوع': s.paid,
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
              if (list.length === 0) throw new Error('لا توجد بيانات لتصديرها');
              return list.map((p) => ({
                'رقم الفاتورة': p.invoice_number ?? p.id,
                'التاريخ': p.invoice_date,
                'معرف المورد': p.supplier_id ?? '',
                'المجموع الفرعي': p.subtotal,
                'الخصم': p.discount,
                'الإجمالي': p.total,
                'المدفوع': p.paid,
              }));
            },
            'purchases.xlsx',
          )
        }
      />
    </Screen>
  );
}

