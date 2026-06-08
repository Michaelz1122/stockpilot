import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Store } from '@/lib/types';

const ACTIVE_KEY = 'sp.activeStoreId';

interface StoreState {
  stores: Store[];
  activeStoreId: string | null;
  initialized: boolean;
  setStores: (stores: Store[]) => void;
  setActiveStore: (id: string | null) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAppStores = create<StoreState>((set, get) => ({
  stores: [],
  activeStoreId: null,
  initialized: false,
  setStores: (stores) => {
    const { activeStoreId } = get();
    let nextActive = activeStoreId;
    if (!nextActive || !stores.find((s) => s.id === nextActive)) {
      nextActive = stores[0]?.id ?? null;
    }
    set({ stores, activeStoreId: nextActive, initialized: true });
    if (nextActive) AsyncStorage.setItem(ACTIVE_KEY, nextActive).catch(() => {});
  },
  setActiveStore: async (id) => {
    set({ activeStoreId: id });
    if (id) await AsyncStorage.setItem(ACTIVE_KEY, id);
    else await AsyncStorage.removeItem(ACTIVE_KEY);
  },
  hydrate: async () => {
    const id = await AsyncStorage.getItem(ACTIVE_KEY);
    set({ activeStoreId: id });
  },
}));

export function getActiveStoreId(): string | null {
  return useAppStores.getState().activeStoreId;
}
