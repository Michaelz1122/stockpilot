import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { CustomersRepo } from '@/repositories/customers.repo';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { ProductsRepo } from '@/repositories/products.repo';
import { normalizeArabic } from '@/lib/arabic';

type DuplicateGroup = {
  type: 'customer' | 'supplier' | 'product';
  name: string;
  items: any[];
};

export default function DataHealthScreen() {
  const router = useRouter();
  const { t, lang } = useLocale();
  const { storeId } = useActiveStore();
  
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [selectedPrimaries, setSelectedPrimaries] = useState<Record<string, string>>({});

  const loadData = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [customers, suppliers, products] = await Promise.all([
        CustomersRepo.list(storeId),
        SuppliersRepo.list(storeId),
        ProductsRepo.list(storeId),
      ]);

      const groups: DuplicateGroup[] = [];

      const findDups = (data: any[], type: 'customer' | 'supplier' | 'product') => {
        const map = new Map<string, any[]>();
        data.forEach(item => {
          const key = normalizeArabic(item.name.trim().toLowerCase());
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(item);
        });
        
        map.forEach((items, name) => {
          if (items.length > 1) {
            groups.push({ type, name: items[0].name, items });
          }
        });
      };

      findDups(customers, 'customer');
      findDups(suppliers, 'supplier');
      findDups(products, 'product');

      setDuplicates(groups);
      
      // Auto-select first item as primary
      const initialSelection: Record<string, string> = {};
      groups.forEach((g, idx) => {
        initialSelection[`${g.type}-${idx}`] = g.items[0].id;
      });
      setSelectedPrimaries(initialSelection);
      
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.error'), 'Failed to load data health check');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  const handleMerge = async (groupIndex: number, group: DuplicateGroup) => {
    const primaryId = selectedPrimaries[`${group.type}-${groupIndex}`];
    if (!primaryId) return;
    
    const secondaryIds = group.items.filter(i => i.id !== primaryId).map(i => i.id);
    if (secondaryIds.length === 0) return;

    setMerging(true);
    try {
      for (const secId of secondaryIds) {
        if (group.type === 'customer') {
          await CustomersRepo.merge(primaryId, secId);
        } else if (group.type === 'supplier') {
          await SuppliersRepo.merge(primaryId, secId);
        } else if (group.type === 'product') {
          await ProductsRepo.merge(primaryId, secId);
        }
      }
      Alert.alert(lang === 'ar' ? 'تم الدمج بنجاح' : 'Merged successfully');
      await loadData();
    } catch (err: any) {
      console.error('Merge failed:', err);
      Alert.alert(t('common.error'), err.message || 'Failed to merge records');
    } finally {
      setMerging(false);
    }
  };

  return (
    <Screen padded>
      <Header title={t('settings.dataHealth') || 'Data Health'} showBack />
      
      <View className="mb-4">
        <Text className="text-muted-foreground text-sm">
          {lang === 'ar' 
            ? 'أداة دمج السجلات المتكررة للحفاظ على صحة البيانات. اختر السجل الأساسي ليتم دمج السجلات الأخرى إليه.' 
            : 'Duplicate records merge utility. Select the primary record to keep, and the others will be merged into it.'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0284C7" className="text-primary" className="mt-8" />
      ) : duplicates.length === 0 ? (
        <View className="flex-1 items-center justify-center pt-10">
          <Ionicons name="checkmark-circle" size={64} color="#0284C7" className="text-primary" />
          <Text className="mt-4 font-semibold text-lg text-card-foreground">
            {lang === 'ar' ? 'بياناتك سليمة' : 'Your data is healthy!'}
          </Text>
          <Text className="text-muted-foreground mt-2">
            {lang === 'ar' ? 'لا توجد سجلات متكررة.' : 'No duplicate records found.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={duplicates}
          keyExtractor={(item, idx) => `${item.type}-${idx}`}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item: group, index }) => (
            <Card className="mb-4 bg-card border-destructive/20">
              <View className="flex-row items-center mb-3">
                <Ionicons name="warning" size={20} color="#EF4444" className="text-destructive" />
                <Text className="ml-2 font-bold text-lg text-card-foreground">
                  {group.type.toUpperCase()}: {group.name}
                </Text>
              </View>
              
              <Text className="text-sm text-muted-foreground mb-3">
                {lang === 'ar' ? 'اختر السجل الأساسي الذي تود الاحتفاظ به:' : 'Select the primary record to keep:'}
              </Text>

              {group.items.map(record => {
                const isSelected = selectedPrimaries[`${group.type}-${index}`] === record.id;
                return (
                  <Pressable 
                    key={record.id}
                    onPress={() => setSelectedPrimaries(prev => ({ ...prev, [`${group.type}-${index}`]: record.id }))}
                    className={`mb-2 p-3 rounded-lg border ${isSelected ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="font-semibold text-card-foreground">{record.name}</Text>
                        <Text className="text-xs text-muted-foreground">ID: {record.id.slice(0, 8)}</Text>
                        {group.type === 'customer' || group.type === 'supplier' ? (
                          <Text className="text-xs text-muted-foreground mt-1">
                            {lang === 'ar' ? 'الرصيد الافتتاحي:' : 'Opening Balance:'} {record.opening_balance}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons 
                        name={isSelected ? "radio-button-on" : "radio-button-off"} 
                        size={20} 
                        color={isSelected ? "var(--primary)" : "var(--muted-foreground)"} 
                      />
                    </View>
                  </Pressable>
                );
              })}

              <View className="mt-4">
                <Button 
                  title={lang === 'ar' ? 'دمج السجلات' : 'Merge Records'} 
                  onPress={() => handleMerge(index, group)} 
                  loading={merging}
                />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
