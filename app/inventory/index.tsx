import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useAsync } from '@/hooks/useAsync';
import { useLocale } from '@/hooks/useLocale';
import { InventoryRepo } from '@/repositories/inventory.repo';
import { ProductsRepo } from '@/repositories/products.repo';
import { formatDateTime, formatNumber } from '@/lib/format';

export default function Inventory() {
  const router = useRouter();
  const { t } = useLocale();
  const { storeId } = useActiveStore();
  const txs = useAsync(
    () => (storeId ? InventoryRepo.list(storeId) : Promise.resolve([])),
    [storeId],
  );
  const products = useAsync(
    () => (storeId ? ProductsRepo.list(storeId) : Promise.resolve([])),
    [storeId],
  );
  const map = useMemo(
    () => new Map((products.data ?? []).map((p: any) => [p.id, p])),
    [products.data],
  );

  return (
    <Screen padded>
      <Header title={t('inventory.title')} subtitle={t('inventory.subtitle')} showBack />
      <Button title={t('inventory.newMovement')} onPress={() => router.push('/inventory/new')} />
      <FlatList
        className="mt-3"
        data={txs.data ?? []}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={
          !txs.loading ? (
            <EmptyState
              icon="swap-vertical"
              title={t('inventory.empty')}
              description={t('inventory.emptyHint')}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const p = map.get(item.product_id) as any;
          return (
            <Card className="mb-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pe-2">
                  <Text className="font-semibold text-foreground">
                    {p?.name ?? t('inventory.unknownProduct')}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {formatDateTime(item.created_at)}
                  </Text>
                  {!!item.note && (
                    <Text className="mt-1 text-xs text-muted-foreground">{item.note}</Text>
                  )}
                </View>
                <View className="items-end gap-1">
                  <Badge
                    label={item.type}
                    tone={item.type === 'IN' ? 'success' : item.type === 'OUT' ? 'danger' : 'info'}
                  />
                  <Text
                    className={`text-base font-bold ${
                      item.type === 'OUT' ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {item.type === 'OUT' ? '-' : '+'}
                    {formatNumber(item.quantity)}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
