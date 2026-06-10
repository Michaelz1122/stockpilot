import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { useLocale } from '@/hooks/useLocale';

interface Props {
  product: Product;
  quantity: string;
  unit_price: string;
  discount: string;
  onChange: (patch: { quantity?: string; unit_price?: string; discount?: string }) => void;
  onRemove: () => void;
  currency?: string;
}

export function InvoiceItemRow({
  product,
  quantity,
  unit_price,
  discount,
  onChange,
  onRemove,
  currency,
}: Props) {
  const { t } = useLocale();
  const qty = Number(quantity || 0);
  const price = Number(unit_price || 0);
  const disc = Number(discount || 0);
  const total = qty * price - disc;

  return (
    <View className="mb-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <View className="flex-row items-center justify-between">
        <Text
          numberOfLines={1}
          className="flex-1 font-semibold text-slate-900 dark:text-slate-50"
        >
          {product.name}
        </Text>
        <Pressable onPress={onRemove} className="ms-2 p-1">
          <Ionicons name="close-circle" size={20} color="#94a3b8" />
        </Pressable>
      </View>
      <View className="mt-2 flex-row gap-2">
        <View className="flex-1">
          <Text className="mb-1 text-[10px] uppercase text-slate-500">{t('invoice.quantity')}</Text>
          <TextInput
            value={quantity}
            onChangeText={(txt) => onChange({ quantity: txt })}
            keyboardType="decimal-pad"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-[10px] uppercase text-slate-500">{t('invoice.unitPrice')}</Text>
          <TextInput
            value={unit_price}
            onChangeText={(txt) => onChange({ unit_price: txt })}
            keyboardType="decimal-pad"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-[10px] uppercase text-slate-500">{t('invoices.discount')}</Text>
          <TextInput
            value={discount}
            onChangeText={(txt) => onChange({ discount: txt })}
            keyboardType="decimal-pad"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </View>
      </View>
      <Text className="mt-2 text-right text-sm font-semibold text-emerald-600">
        {formatMoney(total, currency)}
      </Text>
    </View>
  );
}
