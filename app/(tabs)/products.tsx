import { useState } from 'react';
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
import { cn } from '@/lib/cn';

export default function Products() {
  const router = useRouter();
  const { t } = useLocale();
  const { storeId, store } = useActiveStore();
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  const products = useAsync(
    () => (storeId ? ProductsRepo.search(storeId, q, sortBy) : Promise.resolve([])),
    [storeId, q, sortBy],
  );

  return (
    <Screen padded>
      <Header
        title={t('products.title')}
        subtitle={t(products.data?.length === 1 ? 'products.countOne' : 'products.countOther', {
          count: products.data?.length || 0,
        })}
        right={<StoreSwitcher />}
      />
      
      <View className="flex-row gap-2 mb-3">
        <SearchBar 
          value={q} 
          onChangeText={setQ} 
          placeholder={t('products.searchPlaceholder')} 
          containerClassName="flex-1 mb-0" 
        />
        <Pressable
          onPress={() => {
            const sorts = ['relevance', 'a-z', 'highest-stock', 'lowest-stock', 'newest'];
            const next = sorts[(sorts.indexOf(sortBy) + 1) % sorts.length];
            setSortBy(next);
          }}
          className="bg-card border border-border rounded-xl justify-center items-center px-4"
        >
          <Ionicons name="filter" size={20} color="var(--primary)" />
        </Pressable>
      </View>

      <View className="mb-3 flex-row gap-2">
        <Pressable
          onPress={() => router.push('/products/new')}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
        >
          <Ionicons name="add" size={18} color="var(--primary-foreground)" />
          <Text className="font-semibold text-primary-foreground">{t('products.add')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/import')}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3"
        >
          <Ionicons name="cloud-upload" size={18} color="var(--secondary-foreground)" />
          <Text className="font-semibold text-secondary-foreground">{t('products.import')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/export')}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3"
        >
          <Ionicons name="cloud-download" size={18} color="var(--secondary-foreground)" />
          <Text className="font-semibold text-secondary-foreground">{t('products.export')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={products.data ?? []}
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
              leadingIcon={item.is_favorite ? 'star' : 'cube'}
              leadingIconColor={item.is_favorite ? '#F59E0B' : undefined}
              onPress={() => router.push(`/products/${item.id}`)}
              right={
                <View className="items-end">
                  <Text className="text-base font-bold text-card-foreground">
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
