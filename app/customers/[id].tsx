import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NotesEditor } from '@/components/NotesEditor';
import { useAsync } from '@/hooks/useAsync';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { CustomersRepo } from '@/repositories/customers.repo';
import { SalesRepo } from '@/repositories/sales.repo';
import { PaymentsRepo } from '@/repositories/payments.repo';
import { formatDate, formatMoney } from '@/lib/format';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, lang } = useLocale();
  const { storeId, store } = useActiveStore();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  const customer = useAsync(() => CustomersRepo.get(String(id)), [id]);
  const sales = useAsync(
    async () => {
      if (!storeId) return [];
      const list = await SalesRepo.list(storeId);
      return list
        .filter((s) => s.customer_id === id)
        .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
    },
    [storeId, id],
  );

  const payments = useAsync(
    async () => {
      if (!storeId) return [];
      const list = await PaymentsRepo.list(storeId);
      return list.filter((p) => p.customer_id === id && p.direction === 'IN');
    },
    [storeId, id],
  );

  if (!customer.data) {
    return (
      <Screen>
        <Header title={t('customer.detailsTitle')} showBack />
        <Text className="text-muted-foreground">{t('common.loading')}</Text>
      </Screen>
    );
  }
  const c = customer.data as any;
  const owedFromSales = (sales.data ?? []).reduce(
    (acc, s) => acc + (Number(s.total) - Number(s.paid)),
    0,
  );
  const totalPaid = (payments.data ?? []).reduce(
    (acc, p) => acc + Number(p.amount),
    0,
  );
  const balance = Number(c.opening_balance ?? 0) + owedFromSales - totalPaid;

  const saveNotes = async (notes: string) => {
    await CustomersRepo.update(c.id, { notes });
  };

  return (
    <Screen padded>
      <Header
        title={c.name}
        subtitle={c.phone ?? ''}
        showBack
        right={
          <View className="flex-row items-center gap-4">
            <Pressable onPress={() => router.push(`/customers/new?id=${c.id}`)}>
              <Ionicons name="pencil" size={20} color="var(--primary)" />
            </Pressable>
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
              <Ionicons name="trash" size={20} color="var(--destructive)" />
            </Pressable>
          </View>
        }
      />
      <Card className="bg-card border-border">
        <Text className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('customer.balance')}
        </Text>
        <Text
          className={`mt-1 text-3xl font-bold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
        >
          {formatMoney(balance, store?.currency)}
        </Text>
        {!!c.address && (
          <Text className="mt-2 text-sm text-muted-foreground">{c.address}</Text>
        )}
        <View className="mt-4 border-t border-border pt-4">
          <Button
            title={lang === 'ar' ? 'تسجيل دفعة نقدية' : 'Record Payment'}
            onPress={() => router.push(`/payments/new?type=customer&id=${c.id}` as any)}
          />
        </View>
      </Card>

      <NotesEditor initialNotes={c.notes} onSave={saveNotes} />

      <View className="mb-4 mt-6 flex-row rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        <Pressable
          onPress={() => setActiveTab('invoices')}
          className={`flex-1 items-center rounded-lg py-2 ${activeTab === 'invoices' ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}
        >
          <Text className={`font-semibold ${activeTab === 'invoices' ? 'text-foreground' : 'text-muted-foreground'}`}>
            {t('customer.invoiceHistory')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('payments')}
          className={`flex-1 items-center rounded-lg py-2 ${activeTab === 'payments' ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}
        >
          <Text className={`font-semibold ${activeTab === 'payments' ? 'text-foreground' : 'text-muted-foreground'}`}>
            {lang === 'ar' ? 'الدفعات المستلمة' : 'Payments'}
          </Text>
        </Pressable>
      </View>

      {activeTab === 'invoices' ? (
        <FlatList
          data={sales.data ?? []}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={
            <Text className="text-sm text-muted-foreground">{t('customer.noInvoices')}</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/invoices/sale/${item.id}`)}
              className="mb-2 flex-row items-center justify-between rounded-2xl bg-white p-4 dark:bg-slate-800"
            >
              <View>
                <Text className="font-semibold text-foreground">
                  {item.invoice_number ?? `#${item.id.slice(0, 8)}`}
                </Text>
                <Text className="text-xs text-muted-foreground">{formatDate(item.invoice_date)}</Text>
              </View>
              <View className="items-end">
                <Text className="font-bold text-foreground">
                  {formatMoney(item.total, store?.currency)}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {t('common.paid')} {formatMoney(item.paid, store?.currency)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={payments.data ?? []}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={
            <Text className="text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد دفعات مسجلة' : 'No payments recorded'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/payments/${item.id}` as any)}
              className="mb-2 flex-row items-center justify-between rounded-2xl bg-white p-4 dark:bg-slate-800"
            >
              <View>
                <Text className="font-semibold text-foreground">
                  {lang === 'ar' ? 'إيصال استلام' : 'Receipt'} #{item.id.slice(0, 8)}
                </Text>
                <Text className="text-xs text-muted-foreground">{formatDate(item.payment_date)}</Text>
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
