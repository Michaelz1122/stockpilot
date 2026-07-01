import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StoreSwitcher } from '@/components/StoreSwitcher';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useAsync } from '@/hooks/useAsync';
import { useLocale } from '@/hooks/useLocale';
import { ReportsService } from '@/services/reports.service';
import { formatMoney, formatNumber } from '@/lib/format';

export default function Dashboard() {
  const router = useRouter();
  const { t, lang } = useLocale();
  const { storeId, store } = useActiveStore();
  const summary = useAsync(
    () => (storeId ? ReportsService.dashboard(storeId) : Promise.resolve(null)),
    [storeId],
  );

  const max = useMemo(() => {
    const s = summary.data?.salesTrend ?? [];
    return Math.max(1, ...s.map((d) => d.sales));
  }, [summary.data]);

  if (!storeId) {
    return (
      <Screen>
        <Header title={t('dashboard.title')} />
        <Text className="text-muted-foreground">{t('dashboard.noActiveStore')}</Text>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={summary.loading} onRefresh={summary.refresh} />
      }
    >
      <Header
        title={t('dashboard.title')}
        subtitle={store?.name}
        right={<StoreSwitcher />}
      />

      {summary.loading && !summary.data ? (
        <View className="mt-12 items-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : summary.data ? (
        <>
          {(summary.data.outOfStockCount > 0 || summary.data.lowStockCount > 0) && (
            <Pressable
              onPress={() => router.push('/reports')}
              className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex-row items-center gap-3"
            >
              <Ionicons name="warning" size={24} color="var(--destructive)" />
              <View className="flex-1">
                <Text className="font-bold text-destructive">
                  {lang === 'ar' ? 'تنبيه المخزون' : 'Stock Alert'}
                </Text>
                <Text className="text-sm text-destructive/80 mt-1">
                  {lang === 'ar' 
                    ? `يوجد ${summary.data.outOfStockCount} منتج نفذت كميته، و ${summary.data.lowStockCount} منتج قارب على النفاذ.`
                    : `You have ${summary.data.outOfStockCount} products out of stock, and ${summary.data.lowStockCount} low on stock.`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="var(--destructive)" />
            </Pressable>
          )}

          <View className="flex-row gap-3">
            <StatCard
              label={t('dashboard.inventoryValue')}
              value={formatMoney(summary.data.inventoryValue, store?.currency)}
              icon="cube"
              tone="brand"
              onPress={() => router.push('/(tabs)/products')}
            />
            <StatCard
              label={t('dashboard.revenue30d')}
              value={formatMoney(summary.data.revenue30d, store?.currency)}
              icon="trending-up"
              tone="success"
              onPress={() => router.push('/reports')}
            />
          </View>
          <View className="mt-3 flex-row gap-3">
            <StatCard
              label={t('dashboard.profit30d')}
              value={formatMoney(summary.data.profit30d, store?.currency)}
              icon="cash"
              tone="success"
              onPress={() => router.push('/reports')}
            />
            <StatCard
              label={t('dashboard.lowStockCount')}
              value={String(summary.data.lowStockCount)}
              icon="alert-circle"
              tone="warning"
              onPress={() => router.push('/reports')}
            />
          </View>
          <View className="mt-3 flex-row gap-2">
            <StatCard
              layout="vertical"
              label={t('dashboard.products')}
              value={formatNumber(summary.data.totalProducts)}
              icon="pricetag"
              onPress={() => router.push('/(tabs)/products')}
            />
            <StatCard
              layout="vertical"
              label={t('dashboard.customers')}
              value={formatNumber(summary.data.totalCustomers)}
              icon="people"
              onPress={() => router.push('/(tabs)/contacts')}
            />
            <StatCard
              layout="vertical"
              label={t('dashboard.suppliers')}
              value={formatNumber(summary.data.totalSuppliers)}
              icon="business"
              onPress={() => router.push('/(tabs)/contacts')}
            />
          </View>

          <Card className="mt-4">
            <Text className="mb-3 text-base font-bold text-card-foreground">
              {t('dashboard.salesTrend')}
            </Text>
            {summary.data.salesTrend.length === 0 ? (
              <Text className="text-sm text-muted-foreground">{t('dashboard.noSales')}</Text>
            ) : (
              <View className="flex-row items-end gap-1">
                {summary.data.salesTrend.slice(-14).map((d) => (
                  <View key={d.day} className="flex-1 items-center">
                    <View
                      className="w-full rounded-t bg-brand-500"
                      style={{ height: Math.max(4, (d.sales / max) * 100) }}
                    />
                    <Text className="mt-1 text-[10px] text-muted-foreground" numberOfLines={1}>
                      {d.day.slice(5)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => router.push('/invoices/new-sale')}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4"
            >
              <Ionicons name="add-circle" color="#fff" size={20} />
              <Text className="font-semibold text-primary-foreground">{t('dashboard.newSale')}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/invoices/new-purchase')}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4"
            >
              <Ionicons name="download" color="#fff" size={20} />
              <Text className="font-semibold text-primary-foreground">{t('dashboard.newPurchase')}</Text>
            </Pressable>
          </View>

          <View className="mt-3 flex-row gap-3">
            <Pressable
              onPress={() => router.push('/import')}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-secondary py-4"
            >
              <Ionicons name="cloud-upload" color={useColorScheme() === 'dark' ? '#f8fafc' : '#0f172a'} size={20} />
              <Text className="font-semibold text-secondary-foreground">
                {t('dashboard.importExcel')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/ai')}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-slate-700 py-4"
            >
              <Ionicons name="sparkles" color="#fff" size={20} />
              <Text className="font-semibold text-primary-foreground">{t('dashboard.aiAssistant')}</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
