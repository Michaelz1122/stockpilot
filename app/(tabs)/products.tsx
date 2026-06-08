import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ListBottomSpacer } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { ListItem } from '@/components/ui/ListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { StoreSwitcher } from '@/components/StoreSwitcher';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useAsync } from '@/hooks/useAsync';
import { useLocale } from '@/hooks/useLocale';
import { ProductsRepo } from '@/repositories/products.repo';
import { formatMoney, formatNumber } from '@/lib/format';
import { matchesAny } from '@/lib/arabic';

export default function Products() {
  const router = useRouter();
  const { t } = useLocale();
  const { storeId, store } = useActiveStore();
  const [q, setQ] = useState('');
  const products = useAsync(
    () => (storeId ? ProductsRepo.list(storeId) : Promise.resolve([])),
    [storeId],
  );

  const filtered = useMemo(() => {
    const all = products.data ?? [];
    if (!q) return all;
    return all.filter((p) =>
      matchesAny([p.name, p.sku, p.barcode, p.category, p.description], q),
    );
  }, [products.data, q]);

  return (
    <Screen padded>
      <Header
        title={t('products.title')}
        subtitle={t(filtered.length === 1 ? 'products.countOne' : 'products.countOther', {
          count: filtered.length,
        })}
        right={<StoreSwitcher />}
      />
      <SearchBar value={q} onChangeText={setQ} placeholder={t('products.searchPlaceholder')} />
      <View className="mb-3 flex-row gap-2">
        <Pressable
          onPress={() => router.push('/products/new')}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand-600 py-3"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="font-semibold text-white">{t('products.add')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/import')}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-slate-200 py-3 dark:bg-slate-800"
        >
          <Ionicons name="cloud-upload" size={18} color="#0f172a" />
          <Text className="font-semibold text-slate-900 dark:text-slate-50">{t('products.import')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/export')}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-slate-200 py-3 dark:bg-slate-800"
        >
          <Ionicons name="cloud-download" size={18} color="#0f172a" />
          <Text className="font-semibold text-slate-900 dark:text-slate-50">{t('products.export')}</Text>
        </Pressable>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        onRefresh={products.refresh}
        refreshing={products.loading}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={11}
        removeClippedSubviews
        ListEmptyComponent={
          !products.loading ? (
            <EmptyState
              icon="cube-outline"
              title={t('products.emptyTitle')}
              description={t('products.emptyHint')}
              actionLabel={t('products.addAction')}
              onAction={() => router.push('/products/new')}
            />
          ) : null
        }
        ListFooterComponent={ListBottomSpacer}
        renderItem={({ item }) => {
          const tone =
            Number(item.current_stock ?? 0) <= 0
              ? 'danger'
              : Number(item.current_stock ?? 0) <= Number(item.minimum_stock)
                ? 'warning'
                : 'success';
          return (
            <ListItem
              title={item.name}
              subtitle={`${item.sku ? `${t('products.sku')} ${item.sku} · ` : ''}${formatMoney(item.sale_price, store?.currency)}`}
              leadingIcon="cube"
              onPress={() => router.push(`/products/${item.id}`)}
              right={
                <View className="items-end">
                  <Text className="text-base font-bold text-slate-900 dark:text-slate-50">
                    {formatNumber(item.current_stock ?? 0)}
                  </Text>
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
              }
            />
          );
        }}
      />
    </Screen>
  );
}
