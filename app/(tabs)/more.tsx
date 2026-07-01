import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { ListItem } from '@/components/ui/ListItem';
import { StoreSwitcher } from '@/components/StoreSwitcher';
import { useAuth } from '@/state/auth';
import { useLocale } from '@/hooks/useLocale';
import { StoresRepo } from '@/repositories/stores.repo';
import { useAppStores } from '@/state/store-context';
import { Ionicons } from '@expo/vector-icons';

export default function More() {
  const router = useRouter();
  const { t, lang } = useLocale();
  const { signOut, user } = useAuth();
  const { setStores, setActiveStore } = useAppStores();

  const seedDemo = async () => {
    try {
      const id = await StoresRepo.seedDemo();
      const all = await StoresRepo.list();
      setStores(all);
      await setActiveStore(id);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? '');
    }
  };

  return (
    <Screen padded scroll>
      <Header title={t('nav.more')} right={<StoreSwitcher />} />
      <View>
        <Text className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('more.operations')}
        </Text>
        <ListItem
          title={t('more.aiAssistant')}
          subtitle={t('more.aiHint')}
          leadingIcon="sparkles"
          onPress={() => router.push('/ai')}
        />
        <ListItem
          title={t('more.inventoryTx')}
          subtitle={t('more.inventoryTxHint')}
          leadingIcon="swap-vertical"
          onPress={() => router.push('/inventory')}
        />
        <ListItem
          title={t('more.reports')}
          subtitle={t('more.reportsHint')}
          leadingIcon="bar-chart"
          onPress={() => router.push('/reports')}
        />
        <ListItem
          title={t('more.importExcel')}
          subtitle={t('more.importHint')}
          leadingIcon="cloud-upload"
          onPress={() => router.push('/import')}
        />
        <ListItem
          title={t('more.exportExcel')}
          subtitle={t('more.exportHint')}
          leadingIcon="cloud-download"
          onPress={() => router.push('/export')}
        />

        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('more.stores')}
        </Text>
        <ListItem
          title={t('store.manage')}
          subtitle={t('store.manageHint')}
          leadingIcon="grid"
          onPress={() => router.push('/stores')}
        />
        <ListItem
          title={t('more.newStore')}
          subtitle={t('more.newStoreHint')}
          leadingIcon="storefront"
          onPress={() => router.push('/stores/new')}
        />
        <ListItem
          title={t('more.seedDemo')}
          subtitle={t('more.seedDemoHint')}
          leadingIcon="flask"
          onPress={() =>
            Alert.alert(t('more.seedDemo'), t('more.seedDemoConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.confirm'), onPress: seedDemo },
            ])
          }
        />

        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('more.account')}
        </Text>
        <ListItem
          title={t('settings.language')}
          subtitle={lang === 'ar' ? 'العربية 🇪🇬' : 'English 🇬🇧'}
          leadingIcon="language"
          onPress={() => router.push('/settings')}
        />
        <ListItem
          title={t('more.settings')}
          subtitle={t('more.settingsHint')}
          leadingIcon="settings"
          onPress={() => router.push('/settings')}
        />
        <ListItem
          title={user?.email ?? t('more.notSignedIn')}
          leadingIcon="person-circle"
        />
        <ListItem
          title={t('more.signOut')}
          leadingIcon="log-out"
          onPress={async () => {
            await signOut();
            router.replace('/auth/sign-in');
          }}
        />
      </View>
    </Screen>
  );
}
