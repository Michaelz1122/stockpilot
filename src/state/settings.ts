import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeType = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => Promise<void>;
  hydrate: () => Promise<void>;
}

const THEME_KEY = 'sp.theme';

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  setTheme: async (theme) => {
    set({ theme });
    await AsyncStorage.setItem(THEME_KEY, theme);
  },
  hydrate: async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
        set({ theme: storedTheme as ThemeType });
      }
    } catch (e) {
      // ignore
    }
  },
}));

export function getResolvedTheme(): 'light' | 'dark' {
  const { theme } = useSettingsStore.getState();
  if (theme === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }
  return theme;
}
