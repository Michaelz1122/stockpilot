import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'document-text-outline',
  title,
  description,
  actionLabel,
  onAction,
}: Props) {
  return (
    <View className="items-center justify-center px-6 py-12">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Ionicons name={icon} size={36} color="#64748b" />
      </View>
      <Text className="text-center text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </Text>
      {description && (
        <Text className="mt-2 text-center text-sm text-slate-500">{description}</Text>
      )}
      {actionLabel && onAction && (
        <View className="mt-6">
          <Button title={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
