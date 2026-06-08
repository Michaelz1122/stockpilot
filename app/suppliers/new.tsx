import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';

export default function NewSupplier() {
  const router = useRouter();
  const { t } = useLocale();
  const { storeId } = useActiveStore();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit } = useForm({
    defaultValues: { name: '', phone: '', address: '', notes: '', opening_balance: '0' },
  });

  const submit = async (data: any) => {
    if (!storeId) return;
    if (!data.name?.trim()) {
      Alert.alert(t('customer.nameRequired'));
      return;
    }
    setLoading(true);
    try {
      await SuppliersRepo.create(storeId, {
        ...data,
        opening_balance: Number(data.opening_balance ?? 0),
      });
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('invoices.couldNotSave'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Header title={t('supplier.newTitle')} showBack />
      <Controller control={control} name="name" render={({ field }) => (
        <Input label={t('customer.name')} value={field.value} onChangeText={field.onChange} />
      )} />
      <Controller control={control} name="phone" render={({ field }) => (
        <Input label={t('customer.phone')} keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />
      )} />
      <Controller control={control} name="address" render={({ field }) => (
        <Input label={t('customer.address')} value={field.value} onChangeText={field.onChange} />
      )} />
      <Controller control={control} name="opening_balance" render={({ field }) => (
        <Input
          label={t('customer.openingBalance')}
          keyboardType="decimal-pad"
          value={String(field.value ?? '')}
          onChangeText={field.onChange}
        />
      )} />
      <Controller control={control} name="notes" render={({ field }) => (
        <Input label={t('customer.notes')} value={field.value} onChangeText={field.onChange} multiline numberOfLines={3} />
      )} />
      <Button title={t('common.save')} loading={loading} onPress={handleSubmit(submit)} />
    </Screen>
  );
}
