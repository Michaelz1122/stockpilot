import '../global.css';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/state/auth';
import { useAppStores } from '@/state/store-context';
import { StoresRepo } from '@/repositories/stores.repo';
import { initI18n } from '@/i18n';

export default function RootLayout() {
  const { ready, user, init, recoveryEvent, clearRecovery } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { setStores, hydrate } = useAppStores();
  const [i18nReady, setI18nReady] = useState(false);
  const [firstLaunch, setFirstLaunch] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await initI18n();
      setFirstLaunch(res.firstLaunch);
      setI18nReady(true);
    })();
    init();
    hydrate();
  }, []);

  useEffect(() => {
    if (recoveryEvent) {
      clearRecovery();
      router.replace('/auth/reset-password?recovery=true' as any);
    }
  }, [recoveryEvent]);

  useEffect(() => {
    if (!i18nReady) return;
    if (firstLaunch && segments[0] !== 'onboarding') {
      router.replace('/onboarding/language');
      return;
    }
    if (!ready) return;
    const isAuthRoute = segments[0] === 'auth';
    const isOnboarding = segments[0] === 'onboarding';
    if (!user && !isAuthRoute && !isOnboarding) {
      router.replace('/auth/sign-in');
    }
  }, [i18nReady, firstLaunch, ready, user, segments]);

  useEffect(() => {
    if (!i18nReady || !ready || !user) return;
    if (firstLaunch) return;
    (async () => {
      try {
        const stores = await StoresRepo.list();
        setStores(stores);
        if (
          stores.length === 0 &&
          segments[0] !== 'stores' &&
          segments[0] !== 'auth' &&
          segments[0] !== 'onboarding'
        ) {
          router.replace('/stores/new');
        }
      } catch (err) {
        // network/auth failure — let user retry
        console.warn('[stores]', err);
      }
    })();
  }, [i18nReady, firstLaunch, ready, user]);

  if (!ready || !i18nReady) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
