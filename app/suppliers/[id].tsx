import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useAsync } from '@/hooks/useAsync';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { PurchasesRepo } from '@/repositories/purchases.repo';
import { formatDate, formatMoney } from '@/lib/format';

export default function SupplierDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const { storeId, store } = useActiveStore();

  const supplier = useAsync(() => SuppliersRepo.get(String(id)), [id]);
  const purchases = useAsync(
    async () => {
      if (!storeId) return [];
      const list = await PurchasesRepo.list(storeId);
      return list
        .filter((p) => p.supplier_id === id)
        .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
    },
    [storeId, id],
  );

  if (!supplier.data) {
    return (
      <Screen>
        <Header title={t('supplier.detailsTitle')} showBack />
        <Text className="text-slate-500">{t('common.loading')}</Text>
      </Screen>
    );
  }
  const s = supplier.data as any;
  const owed = (purchases.data ?? []).reduce(
    (acc, p) => acc + (Number(p.total) - Number(p.paid)),
    0,
  );
  const balance = Number(s.opening_balance ?? 0) + owed;

  return (
    <Screen padded>
      <Header
        title={s.name}
        subtitle={s.phone ?? ''}
        showBack
        right={
          <Pressable
            onPress={() =>
              Alert.alert(t('common.delete'), t('supplier.deletePrompt'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: async () => {
                    await SuppliersRepo.remove(s.id);
                    router.back();
                  },
                },
              ])
            }
          >
            <Ionicons name="trash" size={20} color="#ef4444" />
          </Pressable>
        }
      />
      <Card>
        <Text className="text-xs uppercase tracking-wide text-slate-500">
          {t('supplier.balanceOwed')}
        </Text>
        <Text
          className={`mt-1 text-3xl font-bold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
        >
          {formatMoney(balance, store?.currency)}
        </Text>
        {!!s.address && <Text className="mt-2 text-sm text-slate-500">{s.address}</Text>}
      </Card>

      <Text className="mb-2 mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t('supplier.purchaseHistory')}
      </Text>
      <FlatList
        data={purchases.data ?? []}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={
          <Text className="text-sm text-slate-500">{t('supplier.noPurchases')}</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/invoices/purchase/${item.id}`)}
            className="mb-2 flex-row items-center justify-between rounded-2xl bg-white p-4 dark:bg-slate-800"
          >
            <View>
              <Text className="font-semibold text-slate-900 dark:text-slate-50">
                {item.invoice_number ?? `#${item.id.slice(0, 8)}`}
              </Text>
              <Text className="text-xs text-slate-500">{formatDate(item.invoice_date)}</Text>
            </View>
            <Text className="font-bold text-slate-900 dark:text-slate-50">
              {formatMoney(item.total, store?.currency)}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
