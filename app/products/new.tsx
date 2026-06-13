import { useEffect, useState } from 'react';
import { Alert, View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const { t, lang } = useLocale();
  const { storeId } = useActiveStore();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

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

  useEffect(() => {
    if (!isEditing || !id) return;
    (async () => {
      try {
        const product = await ProductsRepo.get(id);
        if (product) {
          reset({
            name: product.name,
            sku: product.sku ?? '',
            barcode: product.barcode ?? '',
            category: product.category ?? '',
            description: product.description ?? '',
            purchase_price: product.purchase_price,
            sale_price: product.sale_price,
            minimum_stock: product.minimum_stock,
            opening_stock: 0,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [id, isEditing, reset]);

  const submit = async (data: ProductInput) => {
    if (!storeId) return;
    setLoading(true);
    try {
      if (isEditing && id) {
        await ProductsRepo.update(id, data as any);
        Alert.alert(
          lang === 'ar' ? 'تم التعديل' : 'Success',
          lang === 'ar' ? 'تم تعديل الصنف بنجاح!' : 'Product updated successfully!',
        );
        router.back();
      } else {
        await ProductsRepo.create(storeId, data as any);
        Alert.alert(
          lang === 'ar' ? 'تمت الإضافة' : 'Success',
          lang === 'ar' ? 'تم إضافة الصنف بنجاح!' : 'Product added successfully!',
        );
        reset();
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('invoices.couldNotSave'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Screen>
        <Header title={lang === 'ar' ? 'تعديل الصنف' : 'Edit Product'} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title={isEditing ? (lang === 'ar' ? 'تعديل الصنف' : 'Edit Product') : t('products.newTitle')} showBack />
      
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
        {!isEditing && (
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
        )}
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
