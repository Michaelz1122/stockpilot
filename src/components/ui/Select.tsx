import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
        <Text className="mb-1.5 text-sm font-medium text-foreground">
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          'flex-row items-center justify-between rounded-xl border bg-card px-4 py-3',
          error ? 'border-red-500' : 'border-border',
        )}
      >
        <Text
          className={
            selected
              ? 'text-base text-card-foreground'
              : 'text-base text-muted-foreground'
          }
        >
          {selected?.label ?? ph}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748b" />
      </Pressable>
      {!!error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          className="flex-1"
        >
          <Pressable
            onPress={() => setOpen(false)}
            className="flex-1 justify-end bg-black/40"
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="max-h-[85%] rounded-t-3xl bg-card p-4"
              style={{ paddingBottom: Math.max(insets.bottom, 24) }}
            >
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-card-foreground">
                  {label ?? 'Choose'}
                </Text>
                <Pressable onPress={() => setOpen(false)}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </Pressable>
              </View>
              {searchable && (
                <View className="mb-3 flex-row items-center rounded-xl border border-border bg-background px-3">
                  <Ionicons name="search" size={16} color="#94a3b8" />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t('common.search')}
                    placeholderTextColor="#94a3b8"
                    className="ms-2 flex-1 py-2 text-foreground"
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
                    className="flex-row items-center justify-between rounded-xl px-3 py-3 active:bg-secondary"
                  >
                    <View className="flex-1">
                      <Text className="text-base text-card-foreground">
                        {item.label}
                      </Text>
                      {!!item.subtitle && (
                        <Text className="text-xs text-muted-foreground">{item.subtitle}</Text>
                      )}
                    </View>
                    {item.value === value && (
                      <Ionicons name="checkmark" size={20} color="#2563eb" />
                    )}
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text className="py-6 text-center text-muted-foreground">
                    No options
                  </Text>
                }
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
