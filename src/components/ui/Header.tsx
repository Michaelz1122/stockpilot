import { Pressable, Text, View, useColorScheme } from 'react-native';
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
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#f8fafc' : '#0f172a';

  return (
    <View className="mb-4 flex-row items-center justify-between gap-3 w-full">
      <View className="flex-row items-center gap-2.5 flex-1">
        {showBack && (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            className="h-10 w-10 items-center justify-center rounded-full bg-secondary active:bg-border"
          >
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={20} color={iconColor} />
          </Pressable>
        )}
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {right && <View className="flex-shrink-0">{right}</View>}
    </View>
  );
}
