import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { useLocale } from '@/hooks/useLocale';

export default function NotFound() {
  const { t } = useLocale();
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-bold text-foreground">
          {t('common.notFound')}
        </Text>
        <Link href="/" className="mt-4 text-brand-700 dark:text-brand-300">
          {t('common.back')}
        </Link>
      </View>
    </Screen>
  );
}
