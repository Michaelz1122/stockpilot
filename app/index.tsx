import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/state/auth';
import { useAppStores } from '@/state/store-context';

export default function Index() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const { stores, activeStoreId } = useAppStores();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/auth/sign-in');
      return;
    }
    if (stores.length === 0) {
      router.replace('/stores/new');
      return;
    }
    if (!activeStoreId) return;
    router.replace('/(tabs)/dashboard');
  }, [ready, user, stores.length, activeStoreId]);

  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator color="#2563eb" />
    </View>
  );
}
