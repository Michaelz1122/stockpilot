import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { InvoiceItemRow } from '@/components/InvoiceItemRow';
import { ProductPicker } from '@/components/ProductPicker';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useAsync } from '@/hooks/useAsync';
import { useLocale } from '@/hooks/useLocale';
import { ProductsRepo } from '@/repositories/products.repo';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { PurchasesRepo } from '@/repositories/purchases.repo';
import { formatMoney } from '@/lib/format';
import type { Product } from '@/lib/types';

interface LineItem {
  product: Product;
  quantity: string;
  unit_price: string;
  discount: string;
}

export default function NewPurchase() {
  const router = useRouter();
  const { t } = useLocale();
  const { storeId, store } = useActiveStore();
  const products = useAsync(
    () => (storeId ? ProductsRepo.list(storeId) : Promise.resolve([])),
    [storeId],
  );
  const suppliers = useAsync(
    () => (storeId ? SuppliersRepo.list(storeId) : Promise.resolve([])),
    [storeId],
  );

  const [items, setItems] = useState<LineItem[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [discount, setDiscount] = useState('0');
  const [paid, setPaid] = useState('0');
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (acc, i) =>
          acc +
          Number(i.quantity || 0) * Number(i.unit_price || 0) -
          Number(i.discount || 0),
        0,
      ),
    [items],
  );
  const total = Math.max(0, subtotal - Number(discount || 0));

  const addProduct = (p: Product) => {
    if (items.find((i) => i.product.id === p.id)) return;
    setItems((prev) => [
      ...prev,
      {
        product: p,
        quantity: '1',
        unit_price: String(p.purchase_price),
        discount: '0',
      },
    ]);
  };

  const save = async () => {
    if (!storeId) return;
    if (items.length === 0) {
      Alert.alert(t('invoices.addAtLeastOne'));
      return;
    }
    setSaving(true);
    try {
      const inv = await PurchasesRepo.create(
        storeId,
        {
          supplier_id: supplierId ?? null,
          invoice_number: invoiceNumber || null,
          discount: Number(discount || 0),
          paid: Number(paid || 0),
          notes: notes || null,
          items: items.map((i) => ({
            product_id: i.product.id,
            quantity: Number(i.quantity),
            unit_cost: Number(i.unit_price),
            discount: Number(i.discount || 0),
          })),
        },
        products.data ?? [],
      );
      router.replace(`/invoices/purchase/${inv.id}`);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('invoices.couldNotSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded>
      <Header title={t('invoices.newPurchase')} showBack />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <Select
          label={t('invoices.supplier')}
          value={supplierId}
          options={[
            { label: t('invoices.noSupplier'), value: '' },
            ...(suppliers.data ?? []).map((s: any) => ({
              label: s.name,
              value: s.id,
              subtitle: s.phone ?? '',
            })),
          ]}
          onChange={(v) => setSupplierId(v || null)}
          searchable
        />
        <Input
          label={t('invoices.invoiceNumber')}
          value={invoiceNumber}
          onChangeText={setInvoiceNumber}
        />
        <Text className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t('invoices.items')}
        </Text>
        {items.map((i, idx) => (
          <InvoiceItemRow
            key={i.product.id}
            product={i.product}
            quantity={i.quantity}
            unit_price={i.unit_price}
            discount={i.discount}
            currency={store?.currency}
            onChange={(patch) =>
              setItems((prev) =>
                prev.map((p, j) => (j === idx ? { ...p, ...patch } : p)),
              )
            }
            onRemove={() =>
              setItems((prev) => prev.filter((_, j) => j !== idx))
            }
          />
        ))}
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-4 dark:border-slate-600"
        >
          <Ionicons name="add" size={18} color="#2563eb" />
          <Text className="font-semibold text-brand-700 dark:text-brand-300">
            {t('invoices.addProduct')}
          </Text>
        </Pressable>
        <Card>
          <View className="flex-row justify-between">
            <Text className="text-slate-500">{t('invoices.subtotal')}</Text>
            <Text className="font-semibold">{formatMoney(subtotal, store?.currency)}</Text>
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <Text className="flex-1 text-slate-500">{t('invoices.invoiceDiscount')}</Text>
            <Input
              containerClassName="w-32 mb-0"
              keyboardType="decimal-pad"
              value={discount}
              onChangeText={setDiscount}
            />
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <Text className="flex-1 text-slate-500">{t('invoices.paid')}</Text>
            <Input
              containerClassName="w-32 mb-0"
              keyboardType="decimal-pad"
              value={paid}
              onChangeText={setPaid}
            />
          </View>
          <View className="mt-3 flex-row justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
            <Text className="text-base font-bold">{t('invoices.total')}</Text>
            <Text className="text-xl font-bold text-emerald-600">
              {formatMoney(total, store?.currency)}
            </Text>
          </View>
        </Card>
        <Input label={t('invoices.notes')} containerClassName="mt-3" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
        <Button title={t('invoices.savePurchase')} loading={saving} onPress={save} />
      </ScrollView>
      <ProductPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addProduct}
        products={products.data ?? []}
        currency={store?.currency}
      />
    </Screen>
  );
}
