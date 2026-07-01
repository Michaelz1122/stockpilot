import { useState } from 'react';
import { Alert, Text, View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { PaymentsRepo } from '@/repositories/payments.repo';
import { useAsync } from '@/hooks/useAsync';
import { CustomersRepo } from '@/repositories/customers.repo';
import { SuppliersRepo } from '@/repositories/suppliers.repo';

export default function NewPayment() {
  const { type, id } = useLocalSearchParams<{ type: 'customer' | 'supplier'; id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
  const { storeId } = useActiveStore();

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const entity = useAsync(() => {
    if (type === 'customer') return CustomersRepo.get(id);
    if (type === 'supplier') return SuppliersRepo.get(id);
    return Promise.resolve(null);
  }, [type, id]);

  const handleSave = async () => {
    if (!storeId || !id || !type) return;
    const val = Number(amount);
    if (isNaN(val) || val <= 0) {
      Alert.alert(lang === 'ar' ? 'خطأ' : 'Error', lang === 'ar' ? 'المبلغ غير صحيح' : 'Invalid amount');
      return;
    }

    setLoading(true);
    try {
      const payment = await PaymentsRepo.create({
        store_id: storeId,
        customer_id: type === 'customer' ? id : null,
        supplier_id: type === 'supplier' ? id : null,
        direction: type === 'customer' ? 'IN' : 'OUT',
        amount: val,
        notes: notes || null,
      });
      router.replace(`/payments/${payment.id}` as any);
    } catch (e: any) {
      Alert.alert(lang === 'ar' ? 'خطأ' : 'Error', e?.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  const title = type === 'customer' 
    ? (lang === 'ar' ? 'تسجيل دفعة نقدية' : 'Record Payment')
    : (lang === 'ar' ? 'تسديد دفعة نقدية' : 'Make Payment');

  return (
    <Screen padded={false} scroll={false}>
      <View className="px-4">
        <Header title={title} showBack />
      </View>
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
      
      <View className="mt-4">
        {entity.data && (
          <Text className="mb-4 text-lg font-bold text-foreground">
            {lang === 'ar' ? 'إلى / من:' : 'To / From:'} {entity.data.name}
          </Text>
        )}

        <Input
          label={lang === 'ar' ? 'المبلغ' : 'Amount'}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <Input
          label={lang === 'ar' ? 'البيان / ملاحظات' : 'Notes'}
          placeholder={lang === 'ar' ? 'مثال: دفعة من الحساب' : 'e.g., Payment from account'}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>
    </ScrollView>

      <View className="border-t border-border bg-card p-4 pb-6">
        <Button
          title={lang === 'ar' ? 'حفظ وإصدار إيصال' : 'Save & Print Receipt'}
          loading={loading}
          onPress={handleSave}
        />
      </View>
    </Screen>
  );
}
