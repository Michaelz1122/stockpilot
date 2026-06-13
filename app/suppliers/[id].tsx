import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { PurchasesRepo } from '@/repositories/purchases.repo';
import { PaymentsRepo } from '@/repositories/payments.repo';
import { formatDate, formatMoney } from '@/lib/format';

export default function SupplierDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, lang } = useLocale();
  const { storeId, store } = useActiveStore();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

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

  const payments = useAsync(
    async () => {
      if (!storeId) return [];
      const list = await PaymentsRepo.list(storeId);
      return list.filter((p) => p.supplier_id === id && p.direction === 'OUT');
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
  const owedFromPurchases = (purchases.data ?? []).reduce(
    (acc, p) => acc + (Number(p.total) - Number(p.paid)),
    0,
  );
  const totalPaid = (payments.data ?? []).reduce(
    (acc, p) => acc + Number(p.amount),
    0,
  );
  const balance = Number(s.opening_balance ?? 0) + owedFromPurchases - totalPaid;

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
        <View className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button
            title={lang === 'ar' ? 'تسديد دفعة نقدية' : 'Make Payment'}
            onPress={() => router.push(`/payments/new?type=supplier&id=${s.id}`)}
          />
        </View>
      </Card>

      <View className="mb-4 mt-6 flex-row rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        <Pressable
          onPress={() => setActiveTab('invoices')}
          className={`flex-1 items-center rounded-lg py-2 ${activeTab === 'invoices' ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}
        >
          <Text className={`font-semibold ${activeTab === 'invoices' ? 'text-slate-900 dark:text-slate-50' : 'text-slate-500'}`}>
            {t('supplier.purchaseHistory')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('payments')}
          className={`flex-1 items-center rounded-lg py-2 ${activeTab === 'payments' ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}
        >
          <Text className={`font-semibold ${activeTab === 'payments' ? 'text-slate-900 dark:text-slate-50' : 'text-slate-500'}`}>
            {lang === 'ar' ? 'الدفعات المسددة' : 'Payments'}
          </Text>
        </Pressable>
      </View>

      {activeTab === 'invoices' ? (
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
      ) : (
        <FlatList
          data={payments.data ?? []}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={
            <Text className="text-sm text-slate-500">
              {lang === 'ar' ? 'لا توجد دفعات مسجلة' : 'No payments recorded'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/payments/${item.id}`)}
              className="mb-2 flex-row items-center justify-between rounded-2xl bg-white p-4 dark:bg-slate-800"
            >
              <View>
                <Text className="font-semibold text-slate-900 dark:text-slate-50">
                  {lang === 'ar' ? 'إيصال دفع' : 'Payment Receipt'} #{item.id.slice(0, 8)}
                </Text>
                <Text className="text-xs text-slate-500">{formatDate(item.payment_date)}</Text>
              </View>
              <View className="items-end">
                <Text className="font-bold text-emerald-600">
                  + {formatMoney(item.amount, store?.currency)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
