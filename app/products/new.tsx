import { useEffect, useState } from 'react';
import { Alert, View, ActivityIndicator, Pressable, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
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
  const [unitInput, setUnitInput] = useState('');

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
        const [product, units] = await Promise.all([
          ProductsRepo.get(id),
          ProductsRepo.getUnits(id)
        ]);
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
            units: units.map(u => u.name),
            is_favorite: product.is_favorite ?? false,
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

      <View className="mt-4">
        <Controller
          control={control}
          name="is_favorite"
          render={({ field }) => (
            <Pressable 
              onPress={() => field.onChange(!field.value)}
              className="flex-row items-center justify-between rounded-xl border border-border bg-card p-4 mb-3"
            >
              <View>
                <Text className="text-base font-semibold text-card-foreground">
                  {lang === 'ar' ? 'صنف مفضل' : 'Favorite Product'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {lang === 'ar' ? 'يظهر دائماً في أعلى قوائم البحث' : 'Always appears at the top of search lists'}
                </Text>
              </View>
              <Ionicons 
                name={field.value ? 'star' : 'star-outline'} 
                size={24} 
                color={field.value ? '#F59E0B' : 'var(--muted-foreground)'} 
              />
            </Pressable>
          )}
        />
      </View>

      <Controller
        control={control}
        name="units"
        render={({ field }) => {
          const addUnit = () => {
            if (!unitInput.trim()) return;
            const newUnits = [...(field.value || []), unitInput.trim()];
            field.onChange(newUnits);
            setUnitInput('');
          };
          const removeUnit = (index: number) => {
            const newUnits = (field.value || []).filter((_, i) => i !== index);
            field.onChange(newUnits);
          };
          return (
            <View className="mb-4">
              <Text className="text-sm font-semibold text-card-foreground mb-2">
                {lang === 'ar' ? 'وحدات القياس' : 'Units'}
              </Text>
              <View className="flex-row gap-2 mb-2">
                <Input
                  containerClassName="flex-1"
                  placeholder={lang === 'ar' ? 'مثال: قطعة، كرتونة، لفة' : 'e.g. Piece, Box, Roll'}
                  value={unitInput}
                  onChangeText={setUnitInput}
                  onSubmitEditing={addUnit}
                />
                <Button title={t('common.add')} onPress={addUnit} className="h-12" />
              </View>
              <View className="flex-row flex-wrap gap-2">
                {(field.value || []).map((u, i) => (
                  <View key={i} className="flex-row items-center bg-secondary rounded-full px-3 py-1">
                    <Text className="text-sm text-secondary-foreground mr-2">{u}</Text>
                    <Pressable onPress={() => removeUnit(i)}>
                      <Ionicons name="close-circle" size={18} color="var(--muted-foreground)" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          );
        }}
      />

      <Button title={t('products.saveProduct')} loading={loading} onPress={handleSubmit(submit)} className="mt-4 mb-8" />
    </Screen>
  );
}
