import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { isRTL } from '@/lib/rtl';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, showBack, right }: Props) {
  const router = useRouter();
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        {showBack && (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800"
          >
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={20} color="#0f172a" />
          </Pressable>
        )}
        <View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {title}
          </Text>
          {!!subtitle && (
            <Text className="text-sm text-slate-500">{subtitle}</Text>
          )}
        </View>
      </View>
      {right}
    </View>
  );
}
