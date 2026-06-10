import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  className?: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
}

export function ListItem({
  title,
  subtitle,
  right,
  onPress,
  className,
  leadingIcon,
}: Props) {
  const Container: any = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      className={cn(
        'mb-2 flex-row items-center justify-between rounded-2xl bg-white p-4',
        'dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60',
        onPress && 'active:opacity-70',
        className,
      )}
    >
      <View className="flex-1 flex-row items-center gap-3 pe-3">
        {leadingIcon && (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
            <Ionicons name={leadingIcon} size={18} color="#2563eb" />
          </View>
        )}
        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="text-base font-semibold text-slate-900 dark:text-slate-50"
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text numberOfLines={1} className="mt-0.5 text-sm text-slate-500">
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View>{right}</View>
    </Container>
  );
}
