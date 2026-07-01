import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, ListBottomSpacer } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { ListItem } from '@/components/ui/ListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { StoreSwitcher } from '@/components/StoreSwitcher';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useAsync } from '@/hooks/useAsync';
import { useLocale } from '@/hooks/useLocale';
import { CustomersRepo } from '@/repositories/customers.repo';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { matchesAny } from '@/lib/arabic';

type Tab = 'customers' | 'suppliers';

export default function Contacts() {
  const router = useRouter();
  const { t } = useLocale();
  const { storeId, store } = useActiveStore();
  const [tab, setTab] = useState<Tab>('customers');
  const [q, setQ] = useState('');

  const customers = useAsync(
    () => (storeId ? CustomersRepo.list(storeId) : Promise.resolve([])),
    [storeId, tab],
  );
  const suppliers = useAsync(
    () => (storeId ? SuppliersRepo.list(storeId) : Promise.resolve([])),
    [storeId, tab],
  );
  const data = tab === 'customers' ? customers : suppliers;

  const filtered = useMemo(() => {
    const list = (data.data ?? []) as any[];
    if (!q) return list;
    return list.filter((c) => matchesAny([c.name, c.phone, c.address], q));
  }, [data.data, q]);

  return (
    <Screen padded>
      <Header
        title={t('contacts.title')}
        subtitle={tab === 'customers' ? t('contacts.customers') : t('contacts.suppliers')}
        right={<StoreSwitcher />}
      />
      <View className="mb-3 flex-row gap-2">
        {(['customers', 'suppliers'] as Tab[]).map((tk) => (
          <Pressable
            key={tk}
            onPress={() => setTab(tk)}
            className={cn(
              'flex-1 rounded-xl py-3',
              tab === tk
                ? 'bg-brand-600'
                : 'bg-card border border-border',
            )}
          >
            <Text
              className={cn(
                'text-center font-semibold',
                tab === tk ? 'text-primary-foreground' : 'text-card-foreground',
              )}
            >
              {tk === 'customers' ? t('contacts.customers') : t('contacts.suppliers')}
            </Text>
          </Pressable>
        ))}
      </View>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('common.search')} />
      <Pressable
        onPress={() =>
          router.push(tab === 'customers' ? '/customers/new' : '/suppliers/new')
        }
        className="mb-3 flex-row items-center justify-center gap-2 rounded-xl bg-brand-600 py-3"
      >
        <Ionicons name="person-add" size={18} color="#fff" />
        <Text className="font-semibold text-white">
          {tab === 'customers' ? t('contacts.addCustomer') : t('contacts.addSupplier')}
        </Text>
      </Pressable>
      <FlatList
        data={filtered}
        keyExtractor={(i: any) => i.id}
        onRefresh={data.refresh}
        refreshing={data.loading}
        ListEmptyComponent={
          !data.loading ? (
            <EmptyState
              icon="people-outline"
              title={
                tab === 'customers'
                  ? t('contacts.emptyCustomers')
                  : t('contacts.emptySuppliers')
              }
              actionLabel={
                tab === 'customers' ? t('contacts.addCustomer') : t('contacts.addSupplier')
              }
              onAction={() =>
                router.push(
                  tab === 'customers' ? '/customers/new' : '/suppliers/new',
                )
              }
            />
          ) : null
        }
        ListFooterComponent={ListBottomSpacer}
        renderItem={({ item }: any) => (
          <ListItem
            title={item.name}
            subtitle={item.phone ?? item.address ?? ''}
            leadingIcon={tab === 'customers' ? 'person' : 'business'}
            onPress={() =>
              router.push(
                tab === 'customers'
                  ? `/customers/${item.id}`
                  : `/suppliers/${item.id}`,
              )
            }
            right={
              <Text
                className={cn(
                  'text-base font-bold',
                  Number(item.balance ?? 0) > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-foreground',
                )}
              >
                {formatMoney(item.balance ?? 0, store?.currency)}
              </Text>
            }
          />
        )}
      />
    </Screen>
  );
}
