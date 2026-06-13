import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { PaymentsRepo } from '@/repositories/payments.repo';
import { CustomersRepo } from '@/repositories/customers.repo';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { formatDate, formatMoney } from '@/lib/format';
import { sharePaymentAsText } from '@/lib/invoice-share';

export default function PaymentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, lang } = useLocale();
  const { store } = useActiveStore();

  const payment = useAsync(() => PaymentsRepo.get(String(id)), [id]);
  
  const party = useAsync(async () => {
    if (!payment.data) return null;
    if (payment.data.customer_id) {
      return await CustomersRepo.get(payment.data.customer_id);
    } else if (payment.data.supplier_id) {
      return await SuppliersRepo.get(payment.data.supplier_id);
    }
    return null;
  }, [payment.data]);

  if (!payment.data) {
    return (
      <Screen>
        <Header title={lang === 'ar' ? 'الإيصال' : 'Receipt'} showBack />
        <Text className="text-slate-500">{t('common.loading')}</Text>
      </Screen>
    );
  }
  const p = payment.data;
  const isCustomer = !!p.customer_id;
  const receiptLabel = isCustomer 
    ? (lang === 'ar' ? 'إيصال استلام نقدية' : 'Cash Receipt')
    : (lang === 'ar' ? 'إيصال دفع نقدية' : 'Payment Receipt');

  const onShare = () =>
    sharePaymentAsText({
      storeName: store?.name ?? '',
      storeCurrency: store?.currency ?? 'EGP',
      payment: p,
      partyLabel: isCustomer ? t('invoices.customer') : t('invoices.supplier'),
      partyName: party.data?.name ?? t('common.unknown'),
      receiptLabel,
    });

  const onDelete = () =>
    Alert.alert(lang === 'ar' ? 'حذف الإيصال' : 'Delete Receipt', lang === 'ar' ? 'هل أنت متأكد من حذف هذا الإيصال؟ سيؤثر ذلك على الرصيد.' : 'Are you sure you want to delete this receipt? It will affect the balance.', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await PaymentsRepo.remove(p.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen padded={false}>
      <View className="px-4 pt-2">
        <Header
          title={receiptLabel}
          subtitle={formatDate(p.payment_date)}
          showBack
          right={
            <Pressable onPress={onDelete} className="p-1">
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </Pressable>
          }
        />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className={`rounded-3xl p-5 ${isCustomer ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xs uppercase tracking-wide text-white/80">
                {store?.name ?? ''}
              </Text>
              <Text className="mt-1 text-2xl font-bold text-white">
                #{p.id.slice(0, 8)}
              </Text>
              <Text className="mt-1 text-xs text-white/80">
                {formatDate(p.payment_date)}
              </Text>
            </View>
          </View>
          <View className="mt-4 border-t border-white/20 pt-3">
            <Text className="text-xs text-white/80">
              {isCustomer ? t('invoices.customer') : t('invoices.supplier')}
            </Text>
            <Text className="mt-0.5 text-base font-semibold text-white">
              {party.data?.name ?? t('common.unknown')}
            </Text>
            {!!party.data?.phone && (
              <Text className="text-xs text-white/80">{party.data.phone}</Text>
            )}
          </View>
        </View>

        <Card className="mt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-900 dark:text-slate-50">
              {lang === 'ar' ? 'المبلغ' : 'Amount'}
            </Text>
            <Text className={`text-2xl font-bold ${isCustomer ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatMoney(p.amount, store?.currency)}
            </Text>
          </View>
        </Card>

        {!!p.notes && (
          <Card className="mt-3">
            <Text className="text-xs uppercase tracking-wide text-slate-500">
              {t('invoices.notes')}
            </Text>
            <Text className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {p.notes}
            </Text>
          </Card>
        )}

        <Button
          title={t('invoice.share')}
          variant="primary"
          className="mt-4"
          leftIcon={<Ionicons name="share-social" size={18} color="#fff" />}
          onPress={onShare}
        />
      </ScrollView>
    </Screen>
  );
}
