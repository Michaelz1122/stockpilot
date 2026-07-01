import { useState, useEffect, useRef } from 'react';
import { TextInput, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/hooks/useLocale';

interface Props {
  initialNotes: string;
  onSave: (notes: string) => Promise<void>;
  placeholder?: string;
}

export function NotesEditor({ initialNotes, onSave, placeholder }: Props) {
  const { t } = useLocale();
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initial state if it changes externally
  useEffect(() => {
    setNotes(initialNotes || '');
    setSaved(true);
  }, [initialNotes]);

  const handleChange = (text: string) => {
    setNotes(text);
    setSaved(false);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await onSave(text);
        setSaved(true);
      } catch (err) {
        console.error('Failed to save notes:', err);
      } finally {
        setSaving(false);
      }
    }, 2000);
  };

  const handleBlur = async () => {
    if (!saved && !saving) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setSaving(true);
      try {
        await onSave(notes);
        setSaved(true);
      } catch (err) {
        console.error('Failed to save notes on blur:', err);
      } finally {
        setSaving(false);
      }
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
            <ActivityIndicator size="small" color="var(--muted-foreground)" />
          ) : saved && notes !== initialNotes ? (
            <Ionicons name="checkmark" size={16} color="var(--primary)" />
          ) : null}
        </View>
      </View>
      <TextInput
        value={notes}
        onChangeText={handleChange}
        onBlur={handleBlur}
        multiline
        numberOfLines={4}
        placeholder={placeholder || (t('customer.notesPlaceholder') || 'Enter notes here...')}
        placeholderTextColor="var(--muted-foreground)"
        className="text-sm text-secondary-foreground"
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
    </View>
  );
}
