import { useCallback, useState, useEffect, useRef } from 'react';
import { FlatList, Pressable, Text, View, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen, ListBottomSpacer } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { ListItem } from '@/components/ui/ListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { StoreSwitcher } from '@/components/StoreSwitcher';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { ProductsRepo } from '@/repositories/products.repo';
import { formatMoney, formatNumber } from '@/lib/format';
import type { Product } from '@/lib/types';

const getSortLabel = (val: string, lang: string) => {
  const isAr = lang === 'ar';
  switch (val) {
    case 'relevance': return isAr ? 'الأكثر ملاءمة' : 'Relevance';
    case 'a-z': return isAr ? 'الاسم أ-ي' : 'Name A-Z';
    case 'z-a': return isAr ? 'الاسم ي-أ' : 'Name Z-A';
    case 'highest-stock': return isAr ? 'الأعلى مخزوناً' : 'Highest Stock';
    case 'lowest-stock': return isAr ? 'الأقل مخزوناً' : 'Lowest Stock';
    case 'most-sold': return isAr ? 'الأكثر مبيعاً' : 'Most Sold';
    case 'favorites': return isAr ? 'المفضلة أولاً' : 'Favorites First';
    case 'newest': return isAr ? 'الأحدث' : 'Newest';
    case 'oldest': return isAr ? 'الأقدم' : 'Oldest';
    case 'out-of-stock': return isAr ? 'نفذ من المخزن' : 'Out of Stock';
    case 'low-stock': return isAr ? 'مخزون منخفض' : 'Low Stock';
    default: return val;
  }
};

export default function Products() {
  const router = useRouter();
  const { t, lang } = useLocale();
  const { storeId, store } = useActiveStore();
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const timeoutRef = useRef<any>(null);

  const fetchProducts = useCallback(async (searchQuery: string, currentSort: string, currentOffset: number, append: boolean) => {
    if (!storeId) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const isSearch = searchQuery.trim().length > 0;
      const limit = isSearch ? 1000 : 20;
      const res = await ProductsRepo.search(storeId, searchQuery, currentSort, limit, currentOffset);

      if (append) {
        setData(prev => [...prev, ...res]);
      } else {
        setData(res);
      }

      if (isSearch) {
        setHasMore(false);
      } else {
        setHasMore(res.length === 20);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [storeId]);

  // Load persisted sort on mount
  useEffect(() => {
    AsyncStorage.getItem('@product_sort_by').then((val) => {
      if (val) {
        setSortBy(val);
      }
    });
  }, []);

  // Trigger loading when storeId or sortBy changes
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchProducts(q, sortBy, 0, false);
  }, [storeId, sortBy, fetchProducts]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = (text: string) => {
    setQ(text);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setOffset(0);
      setHasMore(true);
      fetchProducts(text, sortBy, 0, false);
    }, 300);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore || q.trim().length > 0) return;
    const nextOffset = offset + 20;
    setOffset(nextOffset);
    fetchProducts('', sortBy, nextOffset, true);
  };

  const handleRefresh = () => {
    setOffset(0);
    setHasMore(true);
    fetchProducts(q, sortBy, 0, false);
  };

  const changeSort = async (val: string) => {
    setSortBy(val);
    await AsyncStorage.setItem('@product_sort_by', val);
    setSheetOpen(false);
  };

  const keyExtractor = useCallback((item: any) => item.id, []);

  const renderItem = useCallback(({ item }: any) => {
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
  }, [t, store?.currency, router]);

  return (
    <Screen padded>
      <Header
        title={t('products.title')}
        subtitle={t(data.length === 1 ? 'products.countOne' : 'products.countOther', {
          count: data.length || 0,
        })}
        right={<StoreSwitcher />}
      />
      
      <View className="flex-row gap-2 mb-3">
        <SearchBar 
          value={q} 
          onChangeText={handleSearchChange} 
          placeholder={t('products.searchPlaceholder')} 
          containerClassName="flex-1 mb-0" 
        />
        <Pressable
          onPress={() => setSheetOpen(true)}
          className="bg-card border border-border rounded-xl justify-center items-center px-4 active:bg-secondary"
        >
          <Ionicons name="filter" size={20} color="#0284C7" className="text-primary" />
        </Pressable>
      </View>

      {sortBy !== 'relevance' && (
        <View className="flex-row mb-3 gap-2">
          <View className="flex-row items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
            <Text className="text-xs font-semibold text-primary">
              {getSortLabel(sortBy, lang)}
            </Text>
            <Pressable onPress={() => changeSort('relevance')} className="p-0.5 rounded-full active:bg-primary/20">
              <Ionicons name="close-circle" size={14} color="#0284C7" className="text-primary" />
            </Pressable>
          </View>
        </View>
      )}

      <View className="mb-3 flex-row gap-2">
        <Pressable
          onPress={() => router.push('/products/new')}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3 active:opacity-90"
        >
          <Ionicons name="add" size={18} color="#FFFFFF" className="text-primary-foreground" />
          <Text className="font-semibold text-primary-foreground">{t('products.add')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/import')}
          className="flex-grow flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3 active:bg-border/60"
        >
          <Ionicons name="cloud-upload" size={18} color="#0F172A" className="text-secondary-foreground dark:text-slate-200" />
          <Text className="font-semibold text-secondary-foreground">{t('products.import')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/export')}
          className="flex-grow flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3 active:bg-border/60"
        >
          <Ionicons name="cloud-download" size={18} color="#0F172A" className="text-secondary-foreground dark:text-slate-200" />
          <Text className="font-semibold text-secondary-foreground">{t('products.export')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        onRefresh={handleRefresh}
        refreshing={loading && data.length === 0}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={11}
        removeClippedSubviews
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="cube-outline"
              title={t('products.emptyTitle')}
              description={t('products.emptyHint')}
              actionLabel={t('products.addAction')}
              onAction={() => router.push('/products/new')}
            />
          ) : (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#0284C7" className="text-primary" />
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator size="small" color="#0284C7" className="text-primary" />
            </View>
          ) : ListBottomSpacer
        }
        renderItem={renderItem}
      />

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setSheetOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="max-h-[80%] rounded-t-3xl bg-card p-5 pb-8 border-t border-border">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">
                {lang === 'ar' ? 'ترتيب المنتجات' : 'Sort Products'}
              </Text>
              <Pressable onPress={() => setSheetOpen(false)} className="p-1 rounded-full active:bg-secondary">
                <Ionicons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView className="space-y-1">
              {['relevance', 'a-z', 'z-a', 'highest-stock', 'lowest-stock', 'most-sold', 'favorites', 'newest', 'oldest', 'out-of-stock', 'low-stock'].map((option) => (
                <Pressable
                  key={option}
                  onPress={() => changeSort(option)}
                  className={`flex-row items-center justify-between rounded-xl px-4 py-3.5 mb-2 ${sortBy === option ? 'bg-primary/10 border border-primary/20' : 'border border-transparent bg-secondary/50 active:bg-secondary'}`}
                >
                  <Text className={`text-base ${sortBy === option ? 'font-bold text-primary' : 'text-foreground'}`}>
                    {getSortLabel(option, lang)}
                  </Text>
                  {sortBy === option && (
                    <Ionicons name="checkmark-circle" size={20} color="#0284C7" className="text-primary" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
