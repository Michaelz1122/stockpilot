import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
import { matches } from '@/lib/arabic';
import { useLocale } from '@/hooks/useLocale';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
  subtitle?: string;
}

interface Props<T extends string = string> {
  label?: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
  error?: string;
  searchable?: boolean;
}

export function Select<T extends string = string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
  searchable,
}: Props<T>) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value) ?? null;
  const ph = placeholder ?? t('common.select');
  const filtered =
    searchable && query
      ? options.filter((o) => matches(`${o.label} ${o.subtitle ?? ''}`, query))
      : options;
  return (
    <View className="mb-4">
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          'flex-row items-center justify-between rounded-xl border bg-white px-4 py-3',
          'dark:bg-slate-800',
          error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700',
        )}
      >
        <Text
          className={
            selected
              ? 'text-base text-slate-900 dark:text-slate-100'
              : 'text-base text-slate-400'
          }
        >
          {selected?.label ?? ph}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748b" />
      </Pressable>
      {!!error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="max-h-[70%] rounded-t-3xl bg-white p-4 dark:bg-slate-900"
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {label ?? 'Choose'}
              </Text>
              <Pressable onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
            {searchable && (
              <View className="mb-3 flex-row items-center rounded-xl border border-slate-200 px-3 dark:border-slate-700">
                <Ionicons name="search" size={16} color="#94a3b8" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('common.search')}
                  placeholderTextColor="#94a3b8"
                  className="ml-2 flex-1 py-2 text-slate-900 dark:text-slate-100"
                />
              </View>
            )}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between rounded-xl px-3 py-3 active:bg-slate-100 dark:active:bg-slate-800"
                >
                  <View className="flex-1">
                    <Text className="text-base text-slate-900 dark:text-slate-100">
                      {item.label}
                    </Text>
                    {!!item.subtitle && (
                      <Text className="text-xs text-slate-500">{item.subtitle}</Text>
                    )}
                  </View>
                  {item.value === value && (
                    <Ionicons name="checkmark" size={20} color="#2563eb" />
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text className="py-6 text-center text-slate-500">
                  No options
                </Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
