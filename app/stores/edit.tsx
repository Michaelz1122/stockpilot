import { useEffect, useState } from 'react';
import { Alert, View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { StoresRepo } from '@/repositories/stores.repo';
import { useAppStores } from '@/state/store-context';
import { useLocale } from '@/hooks/useLocale';

export default function EditStore() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLocale();
  const { stores, setStores } = useAppStores();
  const existing = stores.find((s) => s.id === id);

  const STORE_TYPES = [
    { label: t('store.types.electrical'), value: 'electrical' },
    { label: t('store.types.spare_parts'), value: 'spare_parts' },
    { label: t('store.types.grocery'), value: 'grocery' },
    { label: t('store.types.pharmacy'), value: 'pharmacy' },
    { label: t('store.types.general'), value: 'general' },
  ];

  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      name: existing?.name ?? '',
      store_type: existing?.store_type ?? 'general',
      currency: existing?.currency ?? 'EGP',
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        store_type: existing.store_type,
        currency: existing.currency,
      });
    }
  }, [existing?.id]);

  const submit = async (data: any) => {
    if (!id || !existing) return;
    setLoading(true);
    try {
      await StoresRepo.update(String(id), data);
      const fresh = await StoresRepo.list();
      setStores(fresh);
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  if (!existing) {
    return (
      <Screen>
        <Header title={t('store.edit')} showBack />
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false}>
      <View className="px-4">
        <Header title={t('store.edit')} showBack />
      </View>
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            label={t('store.name')}
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="store_type"
        render={({ field }) => (
          <Select
            label={t('store.type')}
            value={field.value}
            options={STORE_TYPES}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="currency"
        render={({ field }) => (
          <Input
            label={t('store.currency')}
            value={field.value}
            onChangeText={field.onChange}
            autoCapitalize="characters"
          />
        )}
      />
      </ScrollView>

      <View className="border-t border-border bg-card p-4 pb-6">
        <Button
          title={t('store.saveChanges')}
          loading={loading}
          onPress={handleSubmit(submit)}
        />
      </View>
    </Screen>
  );
}
