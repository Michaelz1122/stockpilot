import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { setLanguage, type SupportedLang } from '@/i18n';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/cn';

type Step = 'language' | 'welcome' | 'features';

const OPTIONS: Array<{ code: SupportedLang; label: string; native: string; flag: string }> = [
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇪🇬' },
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
];

export default function Onboarding() {
  const router = useRouter();
  const { t, lang } = useLocale();
  const [step, setStep] = useState<Step>('language');
  const [selected, setSelected] = useState<SupportedLang>(lang ?? 'ar');
  const [saving, setSaving] = useState(false);

  const goNextFromLanguage = async () => {
    setSaving(true);
    try {
      const { requiresRestart } = await setLanguage(selected);
      if (requiresRestart) {
        const Updates = await import('expo-updates');
        await Updates.reloadAsync();
        return;
      }
      setStep('welcome');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? '');
    } finally {
      setSaving(false);
    }
  };

  const finish = () => router.replace('/');

  return (
    <Screen scroll>
      {/* Progress dots */}
      <View className="mb-6 mt-2 flex-row items-center justify-center gap-2">
        {(['language', 'welcome', 'features'] as Step[]).map((s) => (
          <View
            key={s}
            className={cn(
              'h-2 rounded-full',
              s === step ? 'w-8 bg-brand-600' : 'w-2 bg-slate-300 dark:bg-slate-700',
            )}
          />
        ))}
      </View>

      {step === 'language' && (
        <LanguageStep
          selected={selected}
          onSelect={setSelected}
          onNext={goNextFromLanguage}
          loading={saving}
          t={t}
        />
      )}
      {step === 'welcome' && (
        <WelcomeStep onNext={() => setStep('features')} t={t} />
      )}
      {step === 'features' && (
        <FeaturesStep onDone={finish} t={t} />
      )}

      {step !== 'language' && (
        <Pressable className="mt-3 py-2" onPress={finish}>
          <Text className="text-center text-sm text-slate-500">{t('onboarding.skip')}</Text>
        </Pressable>
      )}
    </Screen>
  );
}

function LanguageStep({
  selected,
  onSelect,
  onNext,
  loading,
  t,
}: {
  selected: SupportedLang;
  onSelect: (s: SupportedLang) => void;
  onNext: () => void;
  loading: boolean;
  t: any;
}) {
  return (
    <View>
      <View className="mt-4 items-center">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand-600">
          <Ionicons name="language" size={36} color="#fff" />
        </View>
        <Text className="mt-5 text-center text-3xl font-bold text-slate-900 dark:text-slate-50">
          {t('onboarding.chooseLanguage')}
        </Text>
        <Text className="mt-2 text-center text-slate-500">
          {t('onboarding.chooseLanguageHint')}
        </Text>
      </View>
      <View className="mt-8">
        {OPTIONS.map((opt) => {
          const isActive = selected === opt.code;
          return (
            <Pressable
              key={opt.code}
              onPress={() => onSelect(opt.code)}
              className={cn(
                'mb-3 flex-row items-center justify-between rounded-2xl border-2 p-5',
                isActive
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/40'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800',
              )}
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-3xl">{opt.flag}</Text>
                <View>
                  <Text
                    className={cn(
                      'text-xl font-bold',
                      isActive
                        ? 'text-brand-700 dark:text-brand-200'
                        : 'text-slate-900 dark:text-slate-50',
                    )}
                  >
                    {opt.native}
                  </Text>
                  <Text className="text-xs text-slate-500">{opt.label}</Text>
                </View>
              </View>
              <View
                className={cn(
                  'h-7 w-7 items-center justify-center rounded-full',
                  isActive ? 'bg-brand-600' : 'border-2 border-slate-300',
                )}
              >
                {isActive && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Button
        title={t('onboarding.next')}
        className="mt-4"
        loading={loading}
        onPress={onNext}
      />
    </View>
  );
}

function WelcomeStep({ onNext, t }: { onNext: () => void; t: any }) {
  return (
    <View className="flex-1 items-center justify-center pt-6">
      <View className="h-24 w-24 items-center justify-center rounded-3xl bg-brand-600">
        <Ionicons name="cube" size={44} color="#fff" />
      </View>
      <Text className="mt-6 text-center text-3xl font-bold text-slate-900 dark:text-slate-50">
        {t('onboarding.welcome.title')}
      </Text>
      <Text className="mt-3 px-4 text-center text-base text-slate-600 dark:text-slate-300">
        {t('onboarding.welcome.subtitle')}
      </Text>
      <View className="mt-10 w-full">
        <Button title={t('onboarding.next')} onPress={onNext} />
      </View>
    </View>
  );
}

function FeaturesStep({ onDone, t }: { onDone: () => void; t: any }) {
  return (
    <View className="pt-2">
      <Feature
        icon="cube"
        tone="brand"
        title={t('onboarding.welcome.feature1Title')}
        body={t('onboarding.welcome.feature1Body')}
      />
      <Feature
        icon="receipt"
        tone="success"
        title={t('onboarding.welcome.feature2Title')}
        body={t('onboarding.welcome.feature2Body')}
      />
      <Feature
        icon="sparkles"
        tone="warning"
        title={t('onboarding.welcome.feature3Title')}
        body={t('onboarding.welcome.feature3Body')}
      />
      <Button
        title={t('onboarding.getStarted')}
        className="mt-6"
        onPress={onDone}
      />
    </View>
  );
}

const TONE_BG: Record<string, string> = {
  brand: 'bg-brand-100 dark:bg-brand-900/40',
  success: 'bg-emerald-100 dark:bg-emerald-900/40',
  warning: 'bg-amber-100 dark:bg-amber-900/40',
};
const TONE_FG: Record<string, string> = {
  brand: '#2563eb',
  success: '#059669',
  warning: '#d97706',
};

function Feature({
  icon,
  tone,
  title,
  body,
}: {
  icon: any;
  tone: 'brand' | 'success' | 'warning';
  title: string;
  body: string;
}) {
  return (
    <View className="mb-4 flex-row items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <View
        className={cn(
          'h-12 w-12 items-center justify-center rounded-2xl',
          TONE_BG[tone],
        )}
      >
        <Ionicons name={icon} size={22} color={TONE_FG[tone]} />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</Text>
        <Text className="mt-1 text-sm text-slate-600 dark:text-slate-300">{body}</Text>
      </View>
    </View>
  );
}
