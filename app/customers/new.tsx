import { useEffect, useState } from 'react';
import { Alert, View, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CustomersRepo } from '@/repositories/customers.repo';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';

export default function NewCustomer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const { t, lang } = useLocale();
  const { storeId } = useActiveStore();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      notes: '',
      opening_balance: '0',
    },
  });

  useEffect(() => {
    if (!isEditing || !id) return;
    (async () => {
      try {
        const customer = await CustomersRepo.get(id);
        if (customer) {
          reset({
            name: customer.name,
            phone: customer.phone ?? '',
            address: customer.address ?? '',
            notes: customer.notes ?? '',
            opening_balance: '0', // hidden during edit, so value doesn't matter
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [id, isEditing, reset]);

  const submit = async (data: any) => {
    if (!storeId) return;
    if (!data.name?.trim()) {
      Alert.alert(t('customer.nameRequired'));
      return;
    }
    setLoading(true);
    try {
      if (isEditing && id) {
        await CustomersRepo.update(id, {
          name: data.name,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
        });
      } else {
        await CustomersRepo.create(storeId, {
          ...data,
          opening_balance: Number(data.opening_balance ?? 0),
        });
      }
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('invoices.couldNotSave'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Screen>
        <Header title={lang === 'ar' ? 'تعديل العميل' : 'Edit Customer'} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false}>
      <View className="px-4">
        <Header title={isEditing ? (lang === 'ar' ? 'تعديل العميل' : 'Edit Customer') : t('customer.newTitle')} showBack />
      </View>
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <Controller control={control} name="name" render={({ field }) => (
        <Input label={t('customer.name')} value={field.value} onChangeText={field.onChange} />
      )} />
      <Controller control={control} name="phone" render={({ field }) => (
        <Input label={t('customer.phone')} keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} />
      )} />
      <Controller control={control} name="address" render={({ field }) => (
        <Input label={t('customer.address')} value={field.value} onChangeText={field.onChange} />
      )} />
      {!isEditing && (
        <Controller control={control} name="opening_balance" render={({ field }) => (
          <Input
            label={t('customer.openingBalance')}
            keyboardType="decimal-pad"
            value={String(field.value ?? '')}
            onChangeText={field.onChange}
          />
        )} />
      )}
      <Controller control={control} name="notes" render={({ field }) => (
        <Input label={t('customer.notes')} value={field.value} onChangeText={field.onChange} multiline numberOfLines={3} />
      )} />
      </ScrollView>

      <View className="border-t border-border bg-card p-4 pb-6">
        <Button title={t('common.save')} loading={loading} onPress={handleSubmit(submit)} />
      </View>
    </Screen>
  );
}
