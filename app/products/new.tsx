import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProductsRepo } from '@/repositories/products.repo';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { productSchema, type ProductInput } from '@/lib/validation';
import { zodResolver } from '@/lib/zod-resolver';

export default function NewProduct() {
  const router = useRouter();
  const { t, lang } = useLocale();
  const { storeId } = useActiveStore();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<ProductInput>({
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      category: '',
      description: '',
      purchase_price: 0,
      sale_price: 0,
      minimum_stock: 0,
      opening_stock: 0,
    },
    resolver: zodResolver(productSchema) as any,
  });

  const submit = async (data: ProductInput) => {
    if (!storeId) return;
    setLoading(true);
    try {
      await ProductsRepo.create(storeId, data as any);
      Alert.alert(
        lang === 'ar' ? 'تمت الإضافة' : 'Success',
        lang === 'ar' ? 'تم إضافة الصنف بنجاح!' : 'Product added successfully!',
      );
      reset();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('invoices.couldNotSave'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Header title={t('products.newTitle')} showBack />
      
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            label={t('products.name')}
            value={field.value as string}
            onChangeText={field.onChange}
            error={errors.name?.message}
          />
        )}
      />

      <View className="flex-row gap-3">
        <Controller
          control={control}
          name="sku"
          render={({ field }) => (
            <Input 
              containerClassName="flex-1"
              label={t('products.sku')} 
              value={(field.value as string) ?? ''} 
              onChangeText={field.onChange} 
            />
          )}
        />
        <Controller
          control={control}
          name="barcode"
          render={({ field }) => (
            <Input
              containerClassName="flex-1"
              label={t('products.barcode')}
              value={(field.value as string) ?? ''}
              onChangeText={field.onChange}
              keyboardType="number-pad"
            />
          )}
        />
      </View>

      <View className="flex-row gap-3">
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Input
              containerClassName="flex-1"
              label={t('products.category')}
              value={(field.value as string) ?? ''}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="minimum_stock"
          render={({ field }) => (
            <Input
              containerClassName="flex-1"
              label={t('products.minimumStock')}
              keyboardType="decimal-pad"
              value={String(field.value ?? '')}
              onChangeText={(tx) => field.onChange(tx)}
            />
          )}
        />
        <Controller
          control={control}
          name="opening_stock"
          render={({ field }) => (
            <Input
              containerClassName="flex-1"
              label={lang === 'ar' ? 'رصيد أول المدة' : 'Opening Stock'}
              keyboardType="decimal-pad"
              value={String(field.value ?? '')}
              onChangeText={(tx) => field.onChange(tx)}
            />
          )}
        />
      </View>

      <View className="flex-row gap-3">
        <Controller
          control={control}
          name="purchase_price"
          render={({ field }) => (
            <Input
              containerClassName="flex-1"
              label={t('products.purchasePrice')}
              keyboardType="decimal-pad"
              value={String(field.value ?? '')}
              onChangeText={(tx) => field.onChange(tx)}
            />
          )}
        />
        <Controller
          control={control}
          name="sale_price"
          render={({ field }) => (
            <Input
              containerClassName="flex-1"
              label={t('products.salePrice')}
              keyboardType="decimal-pad"
              value={String(field.value ?? '')}
              onChangeText={(tx) => field.onChange(tx)}
            />
          )}
        />
      </View>

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <Input
            label={t('products.description')}
            value={(field.value as string) ?? ''}
            onChangeText={field.onChange}
            multiline
            numberOfLines={3}
          />
        )}
      />
      <Button title={t('products.saveProduct')} loading={loading} onPress={handleSubmit(submit)} />
    </Screen>
  );
}
