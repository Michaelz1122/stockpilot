import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAppStores } from '@/state/store-context';
import { StoresRepo } from '@/repositories/stores.repo';
import { useLocale } from '@/hooks/useLocale';

export default function ManageStores() {
  const router = useRouter();
  const { t } = useLocale();
  const { stores, activeStoreId, setStores, setActiveStore } = useAppStores();

  const refresh = async () => {
    const all = await StoresRepo.list();
    setStores(all);
  };

  const onDelete = (id: string, name: string) => {
    Alert.alert(t('store.deletePrompt'), `"${name}"\n\n${t('store.deleteWarning')}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await StoresRepo.remove(id);
            const fresh = await StoresRepo.list();
            setStores(fresh);
            if (activeStoreId === id) {
              await setActiveStore(fresh[0]?.id ?? null);
            }
            if (fresh.length === 0) router.replace('/stores/new');
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message ?? t('store.couldNotDelete'));
          }
        },
      },
    ]);
  };

  return (
    <Screen padded>
      <Header
        title={t('store.manage')}
        subtitle={`${stores.length}`}
        showBack
      />
      <Button
        title={t('store.create')}
        leftIcon={<Ionicons name="add" size={18} color="#fff" />}
        className="mb-3"
        onPress={() => router.push('/stores/new')}
      />
      <FlatList
        data={stores}
        keyExtractor={(s) => s.id}
        onRefresh={refresh}
        refreshing={false}
        ListEmptyComponent={
          <EmptyState
            icon="storefront-outline"
            title={t('store.empty')}
            description={t('store.emptyHint')}
            actionLabel={t('store.create')}
            onAction={() => router.push('/stores/new')}
          />
        }
        renderItem={({ item }) => {
          const isActive = item.id === activeStoreId;
          return (
            <Card className="mb-2">
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={async () => {
                    await setActiveStore(item.id);
                    router.replace('/(tabs)/dashboard');
                  }}
                  className="flex-1 flex-row items-center gap-3"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-900/40">
                    <Ionicons name="storefront" size={22} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-bold text-card-foreground">
                        {item.name}
                      </Text>
                      {isActive && <Badge label={t('store.activeBadge')} tone="success" />}
                    </View>
                    <Text className="text-xs text-muted-foreground">
                      {item.store_type} · {item.currency}
                    </Text>
                  </View>
                </Pressable>
                <View className="flex-row gap-1">
                  <Pressable
                    onPress={() => router.push(`/stores/edit?id=${item.id}`)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-secondary"
                  >
                    <Ionicons name="pencil" size={16} color="#475569" />
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(item.id, item.name)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40"
                  >
                    <Ionicons name="trash" size={16} color="#dc2626" />
                  </Pressable>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
