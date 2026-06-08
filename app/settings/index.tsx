import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { ListItem } from '@/components/ui/ListItem';
import { useLocale } from '@/hooks/useLocale';
import { LANG_INITIALIZED_KEY, setLanguage, type SupportedLang } from '@/i18n';
import { cn } from '@/lib/cn';

const OPTIONS: Array<{ code: SupportedLang; native: string; flag: string }> = [
  { code: 'ar', native: 'العربية', flag: '🇪🇬' },
  { code: 'en', native: 'English', flag: '🇬🇧' },
];

export default function Settings() {
  const router = useRouter();
  const { t, lang } = useLocale();

  const change = async (code: SupportedLang) => {
    if (code === lang) return;
    const { requiresRestart } = await setLanguage(code);
    if (requiresRestart) {
      try {
        const Updates = await import('expo-updates');
        await Updates.reloadAsync();
        return;
      } catch {
        Alert.alert(t('settings.title'), t('settings.appliedAfterRestart'));
      }
    }
    router.replace('/');
  };

  const replayOnboarding = async () => {
    await AsyncStorage.removeItem(LANG_INITIALIZED_KEY);
    router.replace('/onboarding/language');
  };

  return (
    <Screen padded scroll>
      <Header title={t('settings.title')} showBack />

      <Card className="mb-3">
        <Text className="text-base font-bold text-slate-900 dark:text-slate-50">
          {t('settings.language')}
        </Text>
        <Text className="mt-1 text-xs text-slate-500">
          {t('settings.languageHint')}
        </Text>
        <View className="mt-3">
          {OPTIONS.map((opt) => {
            const active = opt.code === lang;
            return (
              <Pressable
                key={opt.code}
                onPress={() => change(opt.code)}
                className={cn(
                  'mb-2 flex-row items-center justify-between rounded-xl border p-4',
                  active
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                    : 'border-slate-200 dark:border-slate-700',
                )}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">{opt.flag}</Text>
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    {opt.native}
                  </Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={22} color="#2563eb" />
                )}
              </Pressable>
            );
          })}
        </View>
        <Text className="mt-2 text-xs text-slate-500">{t('settings.rtlNote')}</Text>
      </Card>

      <ListItem
        title={t('settings.replayOnboarding')}
        subtitle={t('settings.replayOnboardingHint')}
        leadingIcon="play-circle"
        onPress={replayOnboarding}
      />
    </Screen>
  );
}
