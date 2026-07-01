import { useState } from 'react';
import { Alert, View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useAsync } from '@/hooks/useAsync';
import { useLocale } from '@/hooks/useLocale';
import { ProductsRepo } from '@/repositories/products.repo';
import { InventoryRepo } from '@/repositories/inventory.repo';
import type { InventoryTxType } from '@/lib/types';

export default function NewInventoryTx() {
  const router = useRouter();
  const params = useLocalSearchParams<{ product?: string; type?: string }>();
  const { t } = useLocale();
  const { storeId } = useActiveStore();
  const products = useAsync(
    () => (storeId ? ProductsRepo.list(storeId) : Promise.resolve([])),
    [storeId],
  );
  const [productId, setProductId] = useState<string | null>(params.product ?? null);
  const [type, setType] = useState<InventoryTxType>(
    (params.type as InventoryTxType) ?? 'IN',
  );
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const TYPES = [
    { label: t('inventory.typeIn'), value: 'IN' },
    { label: t('inventory.typeOut'), value: 'OUT' },
    { label: t('inventory.typeAdjust'), value: 'ADJUSTMENT' },
  ];

  const submit = async () => {
    if (!storeId || !productId) {
      Alert.alert(t('inventory.chooseProduct'));
      return;
    }
    const qty = Number(quantity);
    if (!qty || !isFinite(qty)) {
      Alert.alert(t('inventory.invalidQty'));
      return;
    }
    setLoading(true);
    try {
      await InventoryRepo.create(storeId, {
        product_id: productId,
        type,
        quantity: qty,
        unit_cost: Number(cost || 0),
        note: note || null,
      });
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('invoices.couldNotSave'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false} scroll={false}>
      <View className="px-4">
        <Header title={t('inventory.newTitle')} showBack />
      </View>
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <Select
        label={t('inventory.product')}
        value={productId}
        searchable
        options={(products.data ?? []).map((p: any) => ({
          label: p.name,
          value: p.id,
          subtitle: p.sku ?? '',
        }))}
        onChange={(v) => setProductId(v)}
      />
      <Select
        label={t('inventory.type')}
        value={type}
        options={TYPES}
        onChange={(v) => setType(v as InventoryTxType)}
      />
      <Input
        label={t('inventory.quantity')}
        keyboardType="decimal-pad"
        value={quantity}
        onChangeText={setQuantity}
        hint={type === 'ADJUSTMENT' ? t('inventory.adjustHint') : undefined}
      />
      <Input
        label={t('inventory.unitCost')}
        keyboardType="decimal-pad"
        value={cost}
        onChangeText={setCost}
      />
      <Input label={t('inventory.note')} value={note} onChangeText={setNote} />
      </ScrollView>

      <View className="border-t border-border bg-card p-4 pb-6">
        <Button title={t('common.save')} loading={loading} onPress={submit} />
      </View>
    </Screen>
  );
}
