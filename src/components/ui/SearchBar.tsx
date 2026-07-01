import { TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  containerClassName?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search…', containerClassName, autoFocus }: Props) {
  return (
    <View className={cn("mb-3 flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800", containerClassName)}>
      <Ionicons name="search" size={18} color="#64748b" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoFocus={autoFocus}
        className="ms-2 flex-1 py-3 text-base text-slate-900 dark:text-slate-100"
      />
    </View>
  );
}
