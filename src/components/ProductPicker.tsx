import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@/lib/types';
import { formatMoney, formatNumber } from '@/lib/format';
import { matchesAny } from '@/lib/arabic';
import { useLocale } from '@/hooks/useLocale';
import { SearchBar } from '@/components/ui/SearchBar';

interface Props {
  visible: boolean;
  products: Product[];
  onClose: () => void;
  onPick: (p: Product) => void;
  currency?: string;
}

export function ProductPicker({ visible, products, onClose, onPick, currency }: Props) {
  const { t } = useLocale();
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    if (!q) return products;
    return products.filter((p) =>
      matchesAny([p.name, p.sku, p.barcode, p.category], q),
    );
  }, [products, q]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="max-h-[80%] rounded-t-3xl bg-card p-4"
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-card-foreground">
              {t('invoices.addProduct')}
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color="var(--muted-foreground)" />
            </Pressable>
          </View>
          <View className="mb-3 flex-row items-center rounded-xl border border-border px-3 bg-secondary">
            <SearchBar
              value={q}
              onChangeText={setQ}
              placeholder={t('products.searchPlaceholder')}
              containerClassName="mb-0 flex-1"
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onPick(item);
                  onClose();
                }}
                className="mb-2 flex-row items-center justify-between rounded-xl border border-border bg-card px-3 py-3 active:bg-secondary"
              >
                <View className="flex-1 pe-3">
                  <View className="flex-row items-center">
                    <Text
                      className="text-base font-semibold text-card-foreground"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.is_favorite && (
                      <Ionicons name="star" size={12} color="#eab308" className="ml-1" />
                    )}
                  </View>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {item.sku ? `${t('products.sku')} ${item.sku} · ` : ''}
                    {t('ai.stockSuffix', { n: formatNumber(item.current_stock ?? 0) })}
                  </Text>
                </View>
                <Text className="font-semibold text-emerald-600">
                  {formatMoney(item.sale_price, currency)}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text className="py-6 text-center text-muted-foreground">{t('common.noResults')}</Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
