import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAsync } from '@/hooks/useAsync';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { ProductsRepo } from '@/repositories/products.repo';
import { InventoryRepo } from '@/repositories/inventory.repo';
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const { storeId, store } = useActiveStore();

  const product = useAsync(() => ProductsRepo.get(String(id)), [id]);
  const txs = useAsync(
    () => (storeId ? InventoryRepo.list(storeId, String(id)) : Promise.resolve([])),
    [storeId, id],
  );
  const stocks = useAsync(
    () => (storeId ? InventoryRepo.stockByProduct(storeId) : Promise.resolve({} as Record<string, number>)),
    [storeId, txs.data?.length ?? 0],
  );

  if (!product.data) {
    return (
      <Screen>
        <Header title={t('nav.products')} showBack />
        <Text className="text-slate-500">{t('common.loading')}</Text>
      </Screen>
    );
  }

  const p = product.data;
  const current = stocks.data?.[p.id] ?? 0;
  const tone =
    current <= 0
      ? 'danger'
      : current <= Number(p.minimum_stock)
        ? 'warning'
        : 'success';

  return (
    <Screen padded>
      <Header
        title={p.name}
        subtitle={p.category ?? p.sku ?? ''}
        showBack
        right={
          <View className="flex-row items-center gap-4">
            <Pressable onPress={() => router.push(`/products/new?id=${p.id}`)}>
              <Ionicons name="pencil" size={20} color="#3b82f6" />
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert(t('common.delete'), t('products.deletePrompt'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                      await ProductsRepo.remove(p.id);
                      router.back();
                    },
                  },
                ])
              }
            >
              <Ionicons name="trash" size={20} color="#ef4444" />
            </Pressable>
          </View>
        }
      />
      <Card>
        <View className="flex-row justify-between">
          <View>
            <Text className="text-xs text-slate-500">{t('products.currentStock')}</Text>
            <Text className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-50">
              {formatNumber(current)}
            </Text>
            <View className="mt-2">
              <Badge
                label={
                  tone === 'danger'
                    ? t('common.outOfStock')
                    : tone === 'warning'
                      ? t('common.lowStock')
                      : t('common.inStock')
                }
                tone={tone}
              />
            </View>
          </View>
          <View className="items-end">
            <Text className="text-xs text-slate-500">{t('products.salePriceLabel')}</Text>
            <Text className="mt-1 text-xl font-bold text-emerald-600">
              {formatMoney(p.sale_price, store?.currency)}
            </Text>
            <Text className="mt-2 text-xs text-slate-500">{t('products.cost')}</Text>
            <Text className="text-sm text-slate-700 dark:text-slate-200">
              {formatMoney(p.purchase_price, store?.currency)}
            </Text>
          </View>
        </View>
      </Card>

      <View className="mt-3 flex-row gap-2">
        <Button
          title={t('products.stockIn')}
          onPress={() => router.push(`/inventory/new?product=${p.id}&type=IN`)}
        />
        <Button
          title={t('products.stockOut')}
          variant="danger"
          onPress={() => router.push(`/inventory/new?product=${p.id}&type=OUT`)}
        />
        <Button
          title={t('products.adjust')}
          variant="outline"
          onPress={() => router.push(`/inventory/new?product=${p.id}&type=ADJUSTMENT`)}
        />
      </View>

      <Text className="mb-2 mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t('products.stockHistory')}
      </Text>
      <FlatList
        data={txs.data ?? []}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={
          <Text className="text-sm text-slate-500">{t('products.noMovements')}</Text>
        }
        renderItem={({ item }) => (
          <Card className="mb-2">
            <View className="flex-row items-center justify-between">
              <View>
                <Badge
                  label={item.type}
                  tone={item.type === 'IN' ? 'success' : item.type === 'OUT' ? 'danger' : 'info'}
                />
                <Text className="mt-1 text-xs text-slate-500">
                  {formatDateTime(item.created_at)}
                </Text>
                {!!item.note && (
                  <Text className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                    {item.note}
                  </Text>
                )}
              </View>
              <Text
                className={`text-lg font-bold ${
                  item.type === 'OUT' ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {item.type === 'OUT' ? '-' : '+'}
                {formatNumber(item.quantity)}
              </Text>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
