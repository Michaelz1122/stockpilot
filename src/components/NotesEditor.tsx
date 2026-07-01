import { useState, useEffect, useRef } from 'react';
import { TextInput, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/hooks/useLocale';

interface Props {
  initialNotes: string;
  onSave: (notes: string) => Promise<void>;
  placeholder?: string;
}

export function NotesEditor({ initialNotes, onSave, placeholder }: Props) {
  const { t, lang } = useLocale();
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);

  // Sync initial state if it changes externally
  useEffect(() => {
    setNotes(initialNotes || '');
    setSaved(true);
  }, [initialNotes]);

  const handleChange = (text: string) => {
    setNotes(text);
    setSaved(text === (initialNotes || ''));
  };

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      await onSave(notes);
      setSaved(true);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="mt-4 rounded-xl border border-border bg-secondary p-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('customer.notes') || 'Notes'}
        </Text>
        <View className="flex-row items-center">
          {saving ? (
            <ActivityIndicator size="small" color="#475569" className="text-muted-foreground" />
          ) : !saved ? (
            <Pressable
              onPress={handleSave}
              className="rounded-lg bg-primary px-3 py-1 active:opacity-80"
            >
              <Text className="text-xs font-bold text-primary-foreground">
                {lang === 'ar' ? 'حفظ' : 'Save'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <TextInput
        value={notes}
        onChangeText={handleChange}
        multiline
        numberOfLines={4}
        placeholder={placeholder || (t('customer.notesPlaceholder') || 'Enter notes here...')}
        placeholderTextColor="#9ca3af"
        className="text-sm text-secondary-foreground"
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
    </View>
  );
}
