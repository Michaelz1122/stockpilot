import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useAsync } from '@/hooks/useAsync';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { CustomersRepo } from '@/repositories/customers.repo';
import { SalesRepo } from '@/repositories/sales.repo';
import { formatDate, formatMoney } from '@/lib/format';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const { storeId, store } = useActiveStore();

  const customer = useAsync(() => CustomersRepo.get(String(id)), [id]);
  const sales = useAsync(
    async () => {
      if (!storeId) return [];
      const list = await SalesRepo.list(storeId);
      return list.filter((s) => s.customer_id === id);
    },
    [storeId, id],
  );

  if (!customer.data) {
    return (
      <Screen>
        <Header title={t('customer.detailsTitle')} showBack />
        <Text className="text-slate-500">{t('common.loading')}</Text>
      </Screen>
    );
  }
  const c = customer.data as any;
  const owed = (sales.data ?? []).reduce(
    (acc, s) => acc + (Number(s.total) - Number(s.paid)),
    0,
  );
  const balance = Number(c.opening_balance ?? 0) + owed;

  return (
    <Screen padded>
      <Header
        title={c.name}
        subtitle={c.phone ?? ''}
        showBack
        right={
          <Pressable
            onPress={() =>
              Alert.alert(t('common.delete'), t('customer.deletePrompt'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: async () => {
                    await CustomersRepo.remove(c.id);
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
          {t('customer.balance')}
        </Text>
        <Text
          className={`mt-1 text-3xl font-bold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
        >
          {formatMoney(balance, store?.currency)}
        </Text>
        {!!c.address && (
          <Text className="mt-2 text-sm text-slate-500">{c.address}</Text>
        )}
        {!!c.notes && (
          <Text className="mt-1 text-sm text-slate-500">{c.notes}</Text>
        )}
      </Card>

      <Text className="mb-2 mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t('customer.invoiceHistory')}
      </Text>
      <FlatList
        data={sales.data ?? []}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={
          <Text className="text-sm text-slate-500">{t('customer.noInvoices')}</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/invoices/sale/${item.id}`)}
            className="mb-2 flex-row items-center justify-between rounded-2xl bg-white p-4 dark:bg-slate-800"
          >
            <View>
              <Text className="font-semibold text-slate-900 dark:text-slate-50">
                {item.invoice_number ?? `#${item.id.slice(0, 8)}`}
              </Text>
              <Text className="text-xs text-slate-500">{formatDate(item.invoice_date)}</Text>
            </View>
            <View className="items-end">
              <Text className="font-bold text-slate-900 dark:text-slate-50">
                {formatMoney(item.total, store?.currency)}
              </Text>
              <Text className="text-xs text-slate-500">
                {t('common.paid')} {formatMoney(item.paid, store?.currency)}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}
