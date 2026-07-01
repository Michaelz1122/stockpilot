import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { PurchasesRepo } from '@/repositories/purchases.repo';
import { ProductsRepo } from '@/repositories/products.repo';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { shareInvoiceAsText } from '@/lib/invoice-share';

export default function PurchaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#cbd5e1' : '#0f172a';
  const { t } = useLocale();
  const { storeId, store } = useActiveStore();
  const inv = useAsync(() => PurchasesRepo.get(String(id)), [id]);
  const products = useAsync(
    () => (storeId ? ProductsRepo.list(storeId) : Promise.resolve([])),
    [storeId],
  );
  const suppliers = useAsync(
    () => (storeId ? SuppliersRepo.list(storeId) : Promise.resolve([])),
    [storeId],
  );

  if (!inv.data) {
    return (
      <Screen>
        <Header title={t('invoices.purchases')} showBack />
        <Text className="text-muted-foreground">{t('common.loading')}</Text>
      </Screen>
    );
  }
  const i = inv.data;
  const supplier = (suppliers.data ?? []).find((s: any) => s.id === i.supplier_id);
  const productMap = new Map((products.data ?? []).map((p: any) => [p.id, p]));
  const remaining = Math.max(0, Number(i.total) - Number(i.paid));
  const paidFull = remaining <= 0;

  const onShare = () =>
    shareInvoiceAsText({
      storeName: store?.name ?? '',
      storeCurrency: store?.currency ?? 'EGP',
      invoice: i,
      items: i.items.map((it) => ({
        product_name: (productMap.get(it.product_id) as any)?.name ?? t('common.unknown'),
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_cost),
        discount: Number(it.discount),
        line_total: Number(it.line_total),
      })),
      partyLabel: t('invoices.supplier'),
      partyName: supplier?.name ?? '—',
      thanksLine: t('invoice.thanksLine'),
    });

  const onDelete = () =>
    Alert.alert(t('invoices.deleteTitle'), t('invoices.deletePurchasePrompt'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await PurchasesRepo.remove(i.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen padded={false}>
      <View className="px-4 pt-2">
        <Header
          title={i.invoice_number ?? `#${i.id.slice(0, 8)}`}
          subtitle={formatDate(i.invoice_date)}
          showBack
          right={
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push(`/invoices/new-purchase?id=${i.id}` as any)}
                className="p-1"
              >
                <Ionicons name="pencil" size={20} color={iconColor} />
              </Pressable>
              <Pressable onPress={onDelete} className="p-1">
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </Pressable>
            </View>
          }
        />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="rounded-3xl p-5" style={{ backgroundColor: '#059669' }}>
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xs uppercase tracking-wide text-emerald-100">
                {store?.name ?? ''}
              </Text>
              <Text className="mt-1 text-2xl font-bold text-white">
                {i.invoice_number ?? `#${i.id.slice(0, 8)}`}
              </Text>
              <Text className="mt-1 text-xs text-emerald-100">
                {formatDate(i.invoice_date)}
              </Text>
            </View>
            <View
              className={`rounded-full px-3 py-1 ${
                paidFull ? 'bg-emerald-300' : 'bg-amber-500'
              }`}
            >
              <Text className="text-xs font-bold text-emerald-900">
                {paidFull ? t('common.paid') : t('common.due')}
              </Text>
            </View>
          </View>
          <View className="mt-4 border-t border-emerald-400/40 pt-3">
            <Text className="text-xs text-emerald-100">{t('invoices.supplier')}</Text>
            <Text className="mt-0.5 text-base font-semibold text-white">
              {supplier?.name ?? '—'}
            </Text>
            {!!supplier?.phone && (
              <Text className="text-xs text-emerald-100">{supplier.phone}</Text>
            )}
          </View>
        </View>

        <View className="mt-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">
              {t('invoices.items')}
            </Text>
            <Badge label={String(i.items.length)} tone="info" />
          </View>
          {i.items.map((item, idx) => {
            const p = productMap.get(item.product_id) as any;
            return (
              <Card key={item.id} className="mb-2">
                <View className="flex-row items-start gap-3">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                    <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {idx + 1}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-card-foreground">
                      {p?.name ?? t('common.unknown')}
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      {formatNumber(item.quantity)} × {formatMoney(item.unit_cost, store?.currency)}
                    </Text>
                  </View>
                  <Text className="text-base font-bold">
                    {formatMoney(item.line_total, store?.currency)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>

        <Card className="mt-4">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">{t('invoices.subtotal')}</Text>
            <Text className="text-card-foreground">{formatMoney(i.subtotal, store?.currency)}</Text>
          </View>
          {Number(i.discount) > 0 && (
            <View className="mt-1 flex-row justify-between">
              <Text className="text-muted-foreground">{t('invoices.discount')}</Text>
              <Text className="text-amber-600">
                -{formatMoney(i.discount, store?.currency)}
              </Text>
            </View>
          )}
          <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
            <Text className="text-base font-bold text-card-foreground">{t('invoices.total')}</Text>
            <Text className="text-2xl font-bold text-emerald-600">
              {formatMoney(i.total, store?.currency)}
            </Text>
          </View>
          <View className="mt-2 flex-row justify-between">
            <Text className="text-muted-foreground">{t('invoices.paid')}</Text>
            <Text className="text-card-foreground">{formatMoney(i.paid, store?.currency)}</Text>
          </View>
          {remaining > 0 && (
            <View className="mt-1 flex-row justify-between">
              <Text className="font-semibold text-amber-700">{t('invoices.remaining')}</Text>
              <Text className="font-bold text-amber-700">
                {formatMoney(remaining, store?.currency)}
              </Text>
            </View>
          )}
        </Card>

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
