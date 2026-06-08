import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';

interface Props {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  onPress?: () => void;
  className?: string;
}

const TONE_BG: Record<NonNullable<Props['tone']>, string> = {
  brand: 'bg-brand-100 dark:bg-brand-900/40',
  success: 'bg-emerald-100 dark:bg-emerald-900/40',
  warning: 'bg-amber-100 dark:bg-amber-900/40',
  danger: 'bg-red-100 dark:bg-red-900/40',
};
const TONE_FG: Record<NonNullable<Props['tone']>, string> = {
  brand: '#2563eb',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
};

export function StatCard({
  label,
  value,
  icon = 'stats-chart',
  tone = 'brand',
  onPress,
  className,
}: Props) {
  const Container: any = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      className={cn(
        'flex-1 rounded-2xl bg-white p-4 dark:bg-slate-800',
        'border border-slate-200/60 dark:border-slate-700/60',
        onPress && 'active:opacity-70',
        className,
      )}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${TONE_BG[tone]}`}
        >
          <Ionicons name={icon} size={18} color={TONE_FG[tone]} />
        </View>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wide text-slate-500">
            {label}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50"
          >
            {value}
          </Text>
        </View>
        {onPress && (
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        )}
      </View>
    </Container>
  );
}
