import { useAppStores } from '@/state/store-context';

export function useActiveStore() {
  const { stores, activeStoreId } = useAppStores();
  const active = stores.find((s) => s.id === activeStoreId) ?? null;
  return { storeId: activeStoreId, store: active };
}
