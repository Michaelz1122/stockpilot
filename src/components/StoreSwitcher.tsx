import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStores } from '@/state/store-context';
import { useLocale } from '@/hooks/useLocale';
import { StoresRepo } from '@/repositories/stores.repo';

export function StoreSwitcher() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { t } = useLocale();
  const { stores, activeStoreId, setStores, setActiveStore } = useAppStores();
  const active = stores.find((s) => s.id === activeStoreId);

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
            setOpen(false);
            if (fresh.length === 0) router.replace('/stores/new');
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message ?? t('store.couldNotDelete'));
          }
        },
      },
    ]);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-2 rounded-full bg-card border border-border px-3 py-2"
      >
        <View className="h-6 w-6 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50">
          <Ionicons name="storefront" size={12} color="#2563eb" />
        </View>
        <Text
          className="max-w-[120px] text-sm font-semibold text-card-foreground"
          numberOfLines={1}
        >
          {active?.name ?? t('store.none')}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#64748b" />
      </Pressable>

      <Modal
        transparent
        animationType="slide"
        visible={open}
        onRequestClose={() => setOpen(false)}
      >
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable
            className="max-h-[70%] rounded-t-3xl bg-card p-4 border-t border-border"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-card-foreground">
                {t('store.switch')}
              </Text>
              <Pressable
                onPress={() => {
                  setOpen(false);
                  router.push('/stores');
                }}
                className="rounded-full bg-secondary px-3 py-1.5"
              >
                <Text className="text-xs font-semibold text-secondary-foreground">
                  {t('store.manage')}
                </Text>
              </Pressable>
            </View>
            <FlatList
              data={stores}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => {
                const isActive = item.id === activeStoreId;
                return (
                  <View className="mb-1 flex-row items-center gap-2 rounded-xl px-2">
                    <Pressable
                      onPress={async () => {
                        await setActiveStore(item.id);
                        setOpen(false);
                      }}
                      className="flex-1 flex-row items-center justify-between rounded-xl py-3"
                    >
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-card-foreground">
                          {item.name}
                        </Text>
                        <Text className="text-xs text-muted-foreground">{item.store_type}</Text>
                      </View>
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => onDelete(item.id, item.name)}
                      className="h-9 w-9 items-center justify-center rounded-full"
                    >
                      <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    </Pressable>
                  </View>
                );
              }}
            />
            <Pressable
              onPress={() => {
                setOpen(false);
                router.push('/stores/new');
              }}
              className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-brand-600 py-3"
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="font-semibold text-white">{t('store.newStore')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
