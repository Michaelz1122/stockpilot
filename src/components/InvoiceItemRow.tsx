import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product, ProductUnit } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { useLocale } from '@/hooks/useLocale';
import { Select } from '@/components/ui/Select';

interface Props {
  product: Product;
  quantity: string;
  unit_price: string;
  discount: string;
  unit_id?: string;
  availableUnits?: ProductUnit[];
  onChange: (patch: { quantity?: string; unit_price?: string; discount?: string; unit_id?: string }) => void;
  onRemove: () => void;
  currency?: string;
}

export function InvoiceItemRow({
  product,
  quantity,
  unit_price,
  discount,
  unit_id,
  availableUnits,
  onChange,
  onRemove,
  currency,
}: Props) {
  const { t } = useLocale();
  const qty = Number(quantity || 0);
  const price = Number(unit_price || 0);
  const disc = Number(discount || 0);
  const total = qty * price - disc;

  const showUnits = availableUnits && availableUnits.length > 0;

  return (
    <View className="mb-2 rounded-2xl border border-border bg-card p-3">
      <View className="flex-row items-center justify-between">
        <Text
          numberOfLines={1}
          className="flex-1 font-semibold text-card-foreground"
        >
          {product.name}
        </Text>
        <Pressable onPress={onRemove} className="ms-2 p-1">
          <Ionicons name="close-circle" size={20} color="#475569" className="text-muted-foreground" />
        </Pressable>
      </View>

      {showUnits && (
        <View className="mt-2">
          <Select
            options={[
              { label: t('common.defaultUnit'), value: '' },
              ...availableUnits.map(u => ({ label: u.name, value: u.id }))
            ]}
            value={unit_id || ''}
            onChange={(val) => onChange({ unit_id: val || undefined })}
          />
        </View>
      )}

      <View className="mt-2 flex-row gap-2">
        <View className="flex-1">
          <Text className="mb-1 text-[10px] uppercase text-muted-foreground">{t('invoice.quantity')}</Text>
          <TextInput
            value={quantity}
            onChangeText={(txt) => onChange({ quantity: txt })}
            keyboardType="decimal-pad"
            className="rounded-lg border border-border bg-secondary px-2 py-2 text-secondary-foreground"
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-[10px] uppercase text-muted-foreground">{t('invoice.unitPrice')}</Text>
          <TextInput
            value={unit_price}
            onChangeText={(txt) => onChange({ unit_price: txt })}
            keyboardType="decimal-pad"
            className="rounded-lg border border-border bg-secondary px-2 py-2 text-secondary-foreground"
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-[10px] uppercase text-muted-foreground">{t('invoices.discount')}</Text>
          <TextInput
            value={discount}
            onChangeText={(txt) => onChange({ discount: txt })}
            keyboardType="decimal-pad"
            className="rounded-lg border border-border bg-secondary px-2 py-2 text-secondary-foreground"
          />
        </View>
      </View>
      <Text className="mt-2 text-right text-sm font-semibold text-emerald-600">
        {formatMoney(total, currency)}
      </Text>
    </View>
  );
}
