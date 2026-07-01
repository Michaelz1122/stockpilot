import { useEffect } from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useSettingsStore, getResolvedTheme } from '@/state/settings';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    useSettingsStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const resolved = getResolvedTheme();
    if (colorScheme !== resolved) {
      setColorScheme(resolved);
    }
  }, [theme, colorScheme]);

  return (
    <View style={{ flex: 1 }} className={getResolvedTheme() === 'dark' ? 'dark bg-background' : 'light bg-background'}>
      {children}
    </View>
  );
}
