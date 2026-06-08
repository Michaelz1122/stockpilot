import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { StoresRepo } from '@/repositories/stores.repo';
import { useAppStores } from '@/state/store-context';
import type { StoreInput } from '@/lib/validation';
import { useLocale } from '@/hooks/useLocale';

export default function NewStore() {
  const router = useRouter();
  const { t } = useLocale();
  const { setStores, setActiveStore } = useAppStores();
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StoreInput>({
    defaultValues: { name: '', store_type: 'electrical', currency: 'EGP' },
  });

  const STORE_TYPES = [
    { label: t('store.types.electrical'), value: 'electrical' },
    { label: t('store.types.spare_parts'), value: 'spare_parts' },
    { label: t('store.types.grocery'), value: 'grocery' },
    { label: t('store.types.pharmacy'), value: 'pharmacy' },
    { label: t('store.types.general'), value: 'general' },
  ];

  const submit = async (data: StoreInput) => {
    setLoading(true);
    try {
      const created = await StoresRepo.create(data);
      const all = await StoresRepo.list();
      setStores(all);
      await setActiveStore(created.id);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('store.couldNotCreate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Header title={t('store.newStore')} subtitle={t('store.setupHint')} />
      <Controller
        control={control}
        name="name"
        rules={{ required: true }}
        render={({ field }) => (
          <Input
            label={t('store.name')}
            placeholder={t('store.namePh')}
            value={field.value}
            onChangeText={field.onChange}
            error={errors.name && t('common.required')}
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
      <Button
        title={t('common.save')}
        loading={loading}
        onPress={handleSubmit(submit)}
      />
    </Screen>
  );
}
