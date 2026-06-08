import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { ListItem } from '@/components/ui/ListItem';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useAsync } from '@/hooks/useAsync';
import { useLocale } from '@/hooks/useLocale';
import { ReportsService } from '@/services/reports.service';
import { cn } from '@/lib/cn';
import { formatMoney, formatNumber } from '@/lib/format';

type Period = 'day' | 'week' | 'month' | 'year';
type View = 'overview' | 'low' | 'topCustomers' | 'outstanding';

export default function Reports() {
  const router = useRouter();
  const { t } = useLocale();
  const { storeId, store } = useActiveStore();
  const [view, setView] = useState<View>('overview');
  const [period, setPeriod] = useState<Period>('day');

  const dashboard = useAsync(
    () => (storeId ? ReportsService.dashboard(storeId) : Promise.resolve(null)),
    [storeId],
  );
  const lowStock = useAsync(
    () => (storeId ? ReportsService.lowStock(storeId) : Promise.resolve([])),
    [storeId, view],
  );
  const topCustomers = useAsync(
    () =>
      storeId ? ReportsService.topCustomers(storeId, 10) : Promise.resolve([]),
    [storeId, view],
  );
  const outstandingCustomers = useAsync(
    () =>
      storeId
        ? ReportsService.outstandingCustomers(storeId)
        : Promise.resolve([]),
    [storeId, view],
  );
  const outstandingSuppliers = useAsync(
    () =>
      storeId
        ? ReportsService.outstandingSuppliers(storeId)
        : Promise.resolve([]),
    [storeId, view],
  );
  const salesPeriod = useAsync(
    () =>
      storeId
        ? ReportsService.salesByPeriod(storeId, period)
        : Promise.resolve([]),
    [storeId, period, view],
  );

  const viewLabel: Record<View, string> = {
    overview: t('reports.overview'),
    low: t('reports.lowStock'),
    topCustomers: t('reports.topCustomers'),
    outstanding: t('reports.outstanding'),
  };

  return (
    <Screen padded>
      <Header title={t('reports.title')} subtitle={t('reports.subtitle')} showBack />
      <View className="mb-3 flex-row gap-2">
        {(['overview', 'low', 'topCustomers', 'outstanding'] as View[]).map((v) => (
          <Pressable
            key={v}
            onPress={() => setView(v)}
            className={cn(
              'flex-1 rounded-xl px-2 py-2',
              view === v ? 'bg-brand-600' : 'bg-white dark:bg-slate-800',
            )}
          >
            <Text
              className={cn(
                'text-center text-xs font-semibold',
                view === v ? 'text-white' : 'text-slate-700 dark:text-slate-200',
              )}
            >
              {viewLabel[v]}
            </Text>
          </Pressable>
        ))}
      </View>

      {view === 'overview' && (
        <FlatList
          data={salesPeriod.data ?? []}
          keyExtractor={(d) => d.key}
          ListHeaderComponent={
            <>
              <Card>
                <View className="flex-row justify-between"><Text className="text-slate-500">{t('dashboard.revenue30d')}</Text><Text className="font-bold">{formatMoney(dashboard.data?.revenue30d ?? 0, store?.currency)}</Text></View>
                <View className="mt-1 flex-row justify-between"><Text className="text-slate-500">{t('dashboard.profit30d')}</Text><Text className="font-bold text-emerald-600">{formatMoney(dashboard.data?.profit30d ?? 0, store?.currency)}</Text></View>
                <View className="mt-1 flex-row justify-between"><Text className="text-slate-500">{t('dashboard.inventoryValue')}</Text><Text className="font-bold">{formatMoney(dashboard.data?.inventoryValue ?? 0, store?.currency)}</Text></View>
                <View className="mt-1 flex-row justify-between"><Text className="text-slate-500">{t('dashboard.lowStockCount')}</Text><Text className="font-bold">{dashboard.data?.lowStockCount ?? 0}</Text></View>
              </Card>
              <View className="mt-3 flex-row gap-2">
                {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPeriod(p)}
                    className={cn(
                      'flex-1 rounded-lg py-2',
                      period === p ? 'bg-slate-900' : 'bg-slate-100 dark:bg-slate-800',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-center text-xs font-semibold',
                        period === p ? 'text-white' : 'text-slate-700 dark:text-slate-200',
                      )}
                    >
                      {t(`reports.period.${p}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('reports.salesBy', { period: t(`reports.period.${period}`) })}
              </Text>
            </>
          }
          renderItem={({ item }) => (
            <ListItem
              title={item.key}
              right={
                <Text className="font-bold">
                  {formatMoney(item.total, store?.currency)}
                </Text>
              }
            />
          )}
          ListEmptyComponent={
            <Text className="mt-2 text-sm text-slate-500">{t('reports.noData')}</Text>
          }
        />
      )}

      {view === 'low' && (
        <FlatList
          data={lowStock.data ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <ListItem
              title={item.name}
              subtitle={t('reports.minLabel', { n: formatNumber(item.minimum_stock) })}
              onPress={() => router.push(`/products/${item.id}`)}
              right={
                <Text
                  className={cn(
                    'font-bold',
                    Number(item.current_stock ?? 0) <= 0
                      ? 'text-red-600'
                      : 'text-amber-600',
                  )}
                >
                  {formatNumber(item.current_stock ?? 0)}
                </Text>
              }
            />
          )}
          ListEmptyComponent={
            <Text className="text-sm text-slate-500">{t('reports.allHealthy')}</Text>
          }
        />
      )}

      {view === 'topCustomers' && (
        <FlatList
          data={topCustomers.data ?? []}
          keyExtractor={(r) => r.customer.id}
          renderItem={({ item, index }) => (
            <ListItem
              title={`${index + 1}. ${item.customer.name}`}
              subtitle={item.customer.phone ?? ''}
              onPress={() => router.push(`/customers/${item.customer.id}`)}
              right={
                <Text className="font-bold">
                  {formatMoney(item.total, store?.currency)}
                </Text>
              }
            />
          )}
          ListEmptyComponent={
            <Text className="text-sm text-slate-500">{t('reports.noSales')}</Text>
          }
        />
      )}

      {view === 'outstanding' && (
        <FlatList
          data={[
            { header: t('reports.customersHeader') },
            ...(outstandingCustomers.data ?? []).map((c: any) => ({ ...c, kind: 'customer' })),
            { header: t('reports.suppliersHeader') },
            ...(outstandingSuppliers.data ?? []).map((s: any) => ({ ...s, kind: 'supplier' })),
          ]}
          keyExtractor={(it: any, idx) => it.id ?? `h-${idx}`}
          renderItem={({ item }: any) =>
            item.header ? (
              <Text className="mb-1 mt-3 text-xs font-semibold uppercase text-slate-500">
                {item.header}
              </Text>
            ) : (
              <ListItem
                title={item.name}
                subtitle={item.phone ?? ''}
                onPress={() =>
                  router.push(
                    item.kind === 'customer'
                      ? `/customers/${item.id}`
                      : `/suppliers/${item.id}`,
                  )
                }
                right={
                  <Text className="font-bold text-amber-600">
                    {formatMoney(item.balance ?? 0, store?.currency)}
                  </Text>
                }
              />
            )
          }
        />
      )}
    </Screen>
  );
}
