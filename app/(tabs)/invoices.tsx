import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ListBottomSpacer } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { ListItem } from '@/components/ui/ListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { StoreSwitcher } from '@/components/StoreSwitcher';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useAsync } from '@/hooks/useAsync';
import { useLocale } from '@/hooks/useLocale';
import { SalesRepo } from '@/repositories/sales.repo';
import { PurchasesRepo } from '@/repositories/purchases.repo';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney } from '@/lib/format';

type Tab = 'sales' | 'purchases';

export default function Invoices() {
  const router = useRouter();
  const { t, lang } = useLocale();
  const { storeId, store } = useActiveStore();
  const [tab, setTab] = useState<Tab>('sales');

  const sales = useAsync(
    () => (storeId ? SalesRepo.list(storeId) : Promise.resolve([])),
    [storeId, tab],
  );
  const purchases = useAsync(
    () => (storeId ? PurchasesRepo.list(storeId) : Promise.resolve([])),
    [storeId, tab],
  );
  const data = tab === 'sales' ? sales : purchases;

  return (
    <Screen padded>
      <Header
        title={t('invoices.title')}
        subtitle={tab === 'sales' ? t('invoices.salesSubtitle') : t('invoices.purchasesSubtitle')}
        right={<StoreSwitcher />}
      />
      <View className="mb-3 flex-row gap-2">
        {(['sales', 'purchases'] as Tab[]).map((tk) => (
          <Pressable
            key={tk}
            onPress={() => setTab(tk)}
            className={cn(
              'flex-1 rounded-xl py-3 border',
              tab === tk
                ? 'bg-brand-600 border-brand-600'
                : 'bg-card border-border',
            )}
          >
            <Text
              className={cn(
                'text-center font-semibold',
                tab === tk ? 'text-white' : 'text-foreground',
              )}
            >
              {tk === 'sales' ? t('invoices.sales') : t('invoices.purchases')}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() =>
          router.push(tab === 'sales' ? '/invoices/new-sale' : '/invoices/new-purchase')
        }
        className="mb-3 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3 active:opacity-90"
      >
        <Ionicons name="add-circle" size={18} color="#FFFFFF" className="text-primary-foreground" />
        <Text className="font-semibold text-primary-foreground">
          {tab === 'sales' ? t('invoices.newSale') : t('invoices.newPurchase')}
        </Text>
      </Pressable>
      <FlatList
        data={data.data ?? []}
        keyExtractor={(i: any) => i.id}
        onRefresh={data.refresh}
        refreshing={data.loading}
        ListEmptyComponent={
          !data.loading ? (
            <EmptyState
              icon="receipt-outline"
              title={tab === 'sales' ? t('invoices.emptySales') : t('invoices.emptyPurchases')}
              description={t('invoices.emptyHint')}
              actionLabel={t('invoices.create')}
              onAction={() =>
                router.push(
                  tab === 'sales' ? '/invoices/new-sale' : '/invoices/new-purchase',
                )
              }
            />
          ) : null
        }
        ListFooterComponent={ListBottomSpacer}
        renderItem={({ item }: any) => {
          const paidFull = Number(item.paid) >= Number(item.total);
          const isAr = lang === 'ar';
          const entityName = tab === 'sales'
            ? (item.customers?.name ?? (isAr ? 'عميل نقدي' : 'Cash Customer'))
            : (item.suppliers?.name ?? (isAr ? 'مورد نقدي' : 'Cash Supplier'));
          const invoiceNum = item.invoice_number ?? `#${item.id.slice(0, 8)}`;

          return (
            <ListItem
              title={entityName}
              subtitle={`${invoiceNum} · ${formatDate(item.invoice_date)}`}
              leadingIcon="document-text"
              onPress={() =>
                router.push(
                  tab === 'sales'
                    ? `/invoices/sale/${item.id}`
                    : `/invoices/purchase/${item.id}`,
                )
              }
              right={
                <View className="items-end gap-1">
                  <Text className="text-base font-bold text-foreground">
                    {formatMoney(item.total, store?.currency)}
                  </Text>
                  <Badge
                    label={paidFull ? t('common.paid') : t('common.due')}
                    tone={paidFull ? 'success' : 'warning'}
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
