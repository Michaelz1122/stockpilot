import { useEffect, useState, useRef, useCallback } from 'react';
import { FlatList, Modal, Pressable, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@/lib/types';
import { formatMoney, formatNumber } from '@/lib/format';
import { useLocale } from '@/hooks/useLocale';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProductsRepo } from '@/repositories/products.repo';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (p: Product) => void;
  currency?: string;
  storeId?: string;
  products?: Product[]; // Fallback for backward compatibility
}

const PAGE_SIZE = 20;

export function ProductPicker({ visible, onClose, onPick, currency, storeId, products: fallbackProducts }: Props) {
  const { t } = useLocale();
  const [q, setQ] = useState('');
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const timeoutRef = useRef<any>(null);

  const fetchProducts = useCallback(async (searchQuery: string, currentOffset: number, append: boolean) => {
    if (!storeId) {
      if (fallbackProducts) {
        setData(fallbackProducts);
      }
      return;
    }

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const isSearch = searchQuery.trim().length > 0;
      const limit = isSearch ? 1000 : PAGE_SIZE;
      const res = await ProductsRepo.search(storeId, searchQuery, 'relevance', limit, currentOffset);

      if (append) {
        setData(prev => [...prev, ...res]);
      } else {
        setData(res);
      }

      if (isSearch) {
        setHasMore(false);
      } else {
        setHasMore(res.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error fetching products in picker:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [storeId, fallbackProducts]);

  // Load initial page when modal opens
  useEffect(() => {
    if (visible) {
      setQ('');
      setData([]);
      setOffset(0);
      setHasMore(true);
      fetchProducts('', 0, false);
    }
  }, [visible, fetchProducts]);

  // Clean timeout on unmount
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
      fetchProducts(text, 0, false);
    }, 300);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore || q.trim().length > 0) return;
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    fetchProducts('', nextOffset, true);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="max-h-[85%] rounded-t-3xl bg-card p-5 pb-8 border-t border-border"
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-foreground">
              {t('invoices.addProduct')}
            </Text>
            <Pressable onPress={onClose} className="p-1 rounded-full active:bg-secondary">
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
          
          <View className="mb-4">
            <SearchBar
              value={q}
              onChangeText={handleSearchChange}
              placeholder={t('products.searchPlaceholder')}
              containerClassName="mb-0"
              autoFocus
            />
          </View>

          {loading && data.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#0284C7" className="text-primary" />
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onPick(item);
                    onClose();
                  }}
                  className="mb-2.5 flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 active:bg-secondary"
                >
                  <View className="flex-1 pe-3">
                    <View className="flex-row items-center flex-wrap gap-1">
                      <Text
                        className="text-base font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.is_favorite && (
                        <Ionicons name="star" size={14} color="#eab308" />
                      )}
                    </View>
                    <Text className="text-xs text-muted-foreground mt-1">
                      {item.sku ? `${t('products.sku')} ${item.sku} · ` : ''}
                      {t('ai.stockSuffix', { n: formatNumber(item.current_stock ?? 0) })}
                    </Text>
                  </View>
                  <Text className="font-semibold text-emerald-600 dark:text-emerald-400 text-base">
                    {formatMoney(item.sale_price, currency)}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text className="py-12 text-center text-muted-foreground text-sm">
                  {t('common.noResults')}
                </Text>
              }
              ListFooterComponent={
                loadingMore ? (
                  <View className="py-4 items-center justify-center">
                    <ActivityIndicator size="small" color="#0284C7" className="text-primary" />
                  </View>
                ) : null
              }
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
