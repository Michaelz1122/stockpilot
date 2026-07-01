import { useMemo, useState, useEffect } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import type { Product, ProductUnit } from '@/lib/types';

interface LineItem {
  id?: string;
  product: Product;
  quantity: string;
  unit_price: string;
  discount: string;
  unit_id?: string;
  availableUnits?: ProductUnit[];
}

export default function NewPurchase() {
  const router = useRouter();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!editId;
  const { t, lang } = useLocale();
  const { storeId, store } = useActiveStore();
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

  useEffect(() => {
    if (!isEditing || !editId) return;
    (async () => {
      try {
        const inv = await PurchasesRepo.get(editId);
        if (!inv) return;
        setSupplierId(inv.supplier_id ?? null);
        setInvoiceNumber(inv.invoice_number || '');
        setDiscount(String(inv.discount));
        setPaid(String(inv.paid));
        setNotes(inv.notes || '');
        
        // Fetch products and units for items
        const loadedItems: LineItem[] = await Promise.all(
          inv.items.map(async (i: any) => {
            const [product, units] = await Promise.all([
              ProductsRepo.get(i.product_id),
              ProductsRepo.getUnits(i.product_id)
            ]);
            return {
              id: i.id,
              product: product as Product,
              quantity: String(i.quantity),
              unit_price: String(i.unit_cost), // For purchase invoices, unit_cost is the price paid
              discount: String(i.discount),
              unit_id: i.unit_id || undefined,
              availableUnits: units,
            };
          })
        );
        setItems(loadedItems.filter(i => i.product));
      } catch (err) {
        console.error('Failed to load invoice for editing', err);
      }
    })();
  }, [isEditing, editId]);

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

  const addProduct = async (p: Product) => {
    if (items.find((i) => i.product.id === p.id)) {
      setItems((prev) =>
        prev.map((i) =>
          i.product.id === p.id
            ? { ...i, quantity: String(Number(i.quantity || 0) + 1) }
            : i,
        ),
      );
    } else {
      const units = await ProductsRepo.getUnits(p.id);
      setItems((prev) => [
        ...prev,
        {
          product: p,
          quantity: '1',
          unit_price: String(p.purchase_price),
          discount: '0',
          availableUnits: units,
        },
      ]);
    }
  };

  const save = async () => {
    if (!storeId) return;
    if (items.length === 0) {
      Alert.alert(t('invoices.addAtLeastOne'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        supplier_id: supplierId ?? null,
        invoice_number: invoiceNumber || null,
        discount: Number(discount || 0),
        paid: Number(paid || 0),
        notes: notes || null,
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: Number(i.quantity),
          unit_price: i.product.sale_price,
          unit_cost: Number(i.unit_price),
          discount: Number(i.discount || 0),
          unit_id: i.unit_id || null,
        })),
      };

      if (isEditing && editId) {
        await PurchasesRepo.update(editId, payload as any);
        Alert.alert(lang === 'ar' ? 'تم التعديل' : 'Success');
        router.back();
      } else {
        const inv = await PurchasesRepo.create(storeId, payload as any);
        router.replace(`/invoices/purchase/${inv.id}`);
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('invoices.couldNotSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false} scroll={false}>
      <View className="px-4">
        <Header title={isEditing ? t('invoices.editPurchase') : t('invoices.newPurchase')} showBack />
      </View>
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
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
        <Text className="mb-2 text-sm font-semibold text-card-foreground">
          {t('invoices.items')}
        </Text>
        {items.map((i, idx) => (
          <InvoiceItemRow
            key={i.product.id}
            product={i.product}
            quantity={i.quantity}
            unit_price={i.unit_price}
            discount={i.discount}
            unit_id={i.unit_id}
            availableUnits={i.availableUnits}
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
          className="mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 bg-card active:bg-secondary"
        >
          <Ionicons name="add" size={18} color="var(--primary)" />
          <Text className="font-semibold text-primary">
            {t('invoices.addProduct')}
          </Text>
        </Pressable>
        <Card className="bg-card border-border p-4 rounded-2xl shadow-sm">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">{t('invoices.subtotal')}</Text>
            <Text className="font-semibold text-card-foreground">{formatMoney(subtotal, store?.currency)}</Text>
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <Text className="flex-1 text-muted-foreground">{t('invoices.invoiceDiscount')}</Text>
            <Input
              containerClassName="w-32 mb-0"
              keyboardType="decimal-pad"
              value={discount}
              onChangeText={setDiscount}
            />
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <Text className="flex-1 text-muted-foreground">{t('invoices.paid')}</Text>
            <Input
              containerClassName="w-32 mb-0"
              keyboardType="decimal-pad"
              value={paid}
              onChangeText={setPaid}
            />
          </View>
          <View className="mt-3 flex-row justify-between border-t border-border pt-3">
            <Text className="text-base font-bold text-card-foreground">{t('invoices.total')}</Text>
            <Text className="text-xl font-bold text-emerald-600">
              {formatMoney(total, store?.currency)}
            </Text>
          </View>
        </Card>
        <Input label={t('invoices.notes')} containerClassName="mt-3" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      </ScrollView>

      <View className="border-t border-border bg-card p-4 pb-6">
        <Button title={t('invoices.savePurchase')} loading={saving} onPress={save} />
      </View>

      <ProductPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addProduct}
        storeId={storeId ?? undefined}
        currency={store?.currency}
      />
    </Screen>
  );
}
