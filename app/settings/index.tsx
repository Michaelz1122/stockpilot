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
import { useSettingsStore } from '@/state/settings';

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

      <Card className="mb-3 bg-card border-border">
        <Text className="text-base font-bold text-card-foreground">
          {t('settings.language')}
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground">
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
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card',
                )}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">{opt.flag}</Text>
                  <Text className="text-base font-semibold text-card-foreground">
                    {opt.native}
                  </Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={22} color="#0284C7" className="text-primary" />
                )}
              </Pressable>
            );
          })}
        </View>
        <Text className="mt-2 text-xs text-muted-foreground">{t('settings.rtlNote')}</Text>
      </Card>

      <ThemeSelector />

      <ListItem
        title={t('settings.dataHealth')}
        subtitle={t('settings.dataHealthHint')}
        leadingIcon="shield-checkmark"
        onPress={() => router.push('/settings/health' as any)}
      />

      <ListItem
        title={t('settings.backup')}
        subtitle={t('settings.backupHint')}
        leadingIcon="cloud-download"
        onPress={() => router.push('/settings/backup' as any)}
      />

      <ListItem
        title={t('settings.replayOnboarding')}
        subtitle={t('settings.replayOnboardingHint')}
        leadingIcon="play-circle"
        onPress={replayOnboarding}
      />
    </Screen>
  );
}

function ThemeSelector() {
  const { t } = useLocale();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const OPTIONS = [
    { value: 'light', label: t('settings.light'), icon: 'sunny' as const },
    { value: 'dark', label: t('settings.dark'), icon: 'moon' as const },
    { value: 'system', label: t('settings.system'), icon: 'desktop' as const },
  ] as const;

  return (
    <Card className="mb-3 bg-card border-border">
      <Text className="text-base font-bold text-card-foreground">
        {t('settings.theme')}
      </Text>
      <Text className="mt-1 text-xs text-muted-foreground">
        {t('settings.themeHint')}
      </Text>
      <View className="mt-3 flex-row gap-2">
        {OPTIONS.map((opt) => {
          const active = theme === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setTheme(opt.value)}
              className={cn(
                'flex-1 flex-row items-center justify-center gap-2 rounded-xl border p-3',
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              )}
            >
              <Ionicons 
                name={opt.icon} 
                size={18} 
                color={active ? 'var(--primary)' : 'var(--muted-foreground)'} 
              />
              <Text className={cn(
                'text-sm font-semibold',
                active ? 'text-primary' : 'text-card-foreground'
              )}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
