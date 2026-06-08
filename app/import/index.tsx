import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import {
  ExcelService,
  SCHEMAS,
  type ColumnMapping,
  type ImportEntity,
  type ImportPreview,
} from '@/services/excel.service';
import { detectImportEntity, smartMapColumns } from '@/ai/smart-import';
import { ProductsRepo } from '@/repositories/products.repo';
import { CustomersRepo } from '@/repositories/customers.repo';
import { SuppliersRepo } from '@/repositories/suppliers.repo';
import { InventoryRepo } from '@/repositories/inventory.repo';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/cn';

type Step = 'pick' | 'preview' | 'map' | 'validate' | 'import' | 'done';

export default function ImportWizard() {
  const router = useRouter();
  const { t } = useLocale();
  const { storeId } = useActiveStore();
  const [step, setStep] = useState<Step>('pick');
  const [entity, setEntity] = useState<ImportEntity>('products');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [valid, setValid] = useState<any[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; reason: string }>>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  // AI state
  const [aiBusy, setAiBusy] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiNotes, setAiNotes] = useState<string>('');
  const [aiUnmapped, setAiUnmapped] = useState<string[]>([]);
  const [autoDetect, setAutoDetect] = useState(true);

  const sheet = preview?.sheets[sheetIdx];

  const ENTITIES: { label: string; value: ImportEntity }[] = [
    { label: t('import.entities.products'), value: 'products' },
    { label: t('import.entities.customers'), value: 'customers' },
    { label: t('import.entities.suppliers'), value: 'suppliers' },
    { label: t('import.entities.inventory'), value: 'inventory' },
    { label: t('import.entities.price_list'), value: 'price_list' },
  ];

  const pick = async () => {
    try {
      const p = await ExcelService.pickFile();
      if (!p) return;
      setPreview(p);
      setSheetIdx(0);
      setStep('preview');
    } catch (e: any) {
      Alert.alert(t('import.couldNotRead'), e?.message ?? '');
    }
  };

  const runSmartImport = async () => {
    if (!sheet || !storeId) return;
    setAiBusy(true);
    try {
      let finalEntity = entity;
      if (autoDetect) {
        const d = await detectImportEntity(sheet.headers, sheet.rows, storeId);
        finalEntity = d.entity;
        setEntity(d.entity);
      }
      const result = await smartMapColumns(finalEntity, sheet.headers, sheet.rows, storeId);
      setMapping(result.mapping);
      setAiConfidence(result.confidence);
      setAiNotes(result.notes);
      setAiUnmapped(result.unmapped);
      setStep('map');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? '');
    } finally {
      setAiBusy(false);
    }
  };

  const goToMapManual = () => {
    if (!sheet) return;
    setMapping(ExcelService.autoMap(entity, sheet.headers));
    setAiConfidence(null);
    setAiNotes('');
    setAiUnmapped([]);
    setStep('map');
  };

  const validate = () => {
    if (!sheet) return;
    const { valid, errors } = ExcelService.applyMapping(entity, sheet.rows, mapping);
    setValid(valid);
    setErrors(errors);
    setStep('validate');
  };

  const doImport = async () => {
    if (!storeId) return;
    setImporting(true);
    try {
      let n = 0;
      if (entity === 'products') {
        n = await ProductsRepo.bulkInsert(storeId, valid);
      } else if (entity === 'customers') {
        n = await CustomersRepo.bulkInsert(storeId, valid);
      } else if (entity === 'suppliers') {
        n = await SuppliersRepo.bulkInsert(storeId, valid);
      } else if (entity === 'inventory') {
        const products = await ProductsRepo.list(storeId);
        const bySku = new Map(products.map((p) => [p.sku ?? '', p]));
        for (const row of valid) {
          const product = bySku.get(row.sku);
          if (!product) {
            errors.push({ row: 0, reason: `SKU not found: ${row.sku}` });
            continue;
          }
          const typeRaw = String(row.type ?? 'IN').toUpperCase();
          const type = typeRaw === 'OUT' || typeRaw === 'ADJUSTMENT' ? typeRaw : 'IN';
          await InventoryRepo.create(storeId, {
            product_id: product.id,
            type: type as any,
            quantity: Number(row.quantity),
            unit_cost: Number(row.unit_cost ?? product.purchase_price),
            note: row.note ?? null,
          });
          n++;
        }
      } else if (entity === 'price_list') {
        const products = await ProductsRepo.list(storeId);
        const bySku = new Map(products.map((p) => [p.sku ?? '', p]));
        for (const row of valid) {
          const product = bySku.get(row.sku);
          if (!product) continue;
          await ProductsRepo.update(product.id, { sale_price: Number(row.sale_price) });
          n++;
        }
      }
      setImported(n);
      setStep('done');
    } catch (e: any) {
      Alert.alert(t('import.failed'), e?.message ?? '');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Screen scroll>
      <Header
        title={t('import.title')}
        subtitle={t('import.step', { name: step })}
        showBack
      />

      <Card className="mb-3">
        <View className="flex-row items-center gap-1.5">
          {(['pick', 'preview', 'map', 'validate', 'done'] as Step[]).map((s, i) => (
            <View key={s} className="flex-row items-center">
              <View
                className={`h-7 w-7 items-center justify-center rounded-full ${
                  step === s ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${step === s ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {i + 1}
                </Text>
              </View>
              {i < 4 && <View className="h-px w-4 bg-slate-300" />}
            </View>
          ))}
        </View>
      </Card>

      {step === 'pick' && (
        <View>
          <Select
            label={t('import.entityLabel')}
            value={entity}
            options={ENTITIES}
            onChange={(v) => setEntity(v as ImportEntity)}
          />
          <Pressable
            onPress={() => setAutoDetect((v) => !v)}
            className="mb-3 flex-row items-center gap-2"
          >
            <View
              className={cn(
                'h-5 w-5 items-center justify-center rounded',
                autoDetect ? 'bg-brand-600' : 'border-2 border-slate-400',
              )}
            >
              {autoDetect && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text className="text-sm text-slate-700 dark:text-slate-200">
              {t('import.smart.autoDetectEntity')}
            </Text>
          </Pressable>
          <Card className="mb-3">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('import.expectedCols')}
            </Text>
            <Text className="mt-1 text-xs text-slate-500">{t('import.expectedHint')}</Text>
            <View className="mt-2 flex-row flex-wrap gap-1">
              {SCHEMAS[entity].map((f) => (
                <Badge
                  key={f.field}
                  label={`${f.field}${f.required ? ' *' : ''}`}
                  tone={f.required ? 'info' : 'neutral'}
                />
              ))}
            </View>
          </Card>
          <Button
            title={t('import.chooseFile')}
            leftIcon={<Ionicons name="cloud-upload" size={18} color="#fff" />}
            onPress={pick}
          />
        </View>
      )}

      {step === 'preview' && sheet && (
        <View>
          <Card>
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {preview!.fileName}
            </Text>
            <Text className="mt-1 text-xs text-slate-500">
              {t(preview!.sheets.length === 1 ? 'import.sheets_one' : 'import.sheets_other', {
                count: preview!.sheets.length,
              })}
              {' · '}
              {t('import.rows', { count: sheet.rows.length })}
            </Text>
          </Card>
          {preview!.sheets.length > 1 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {preview!.sheets.map((s, i) => (
                <Pressable
                  key={s.name}
                  onPress={() => setSheetIdx(i)}
                  className={`rounded-full px-3 py-1.5 ${
                    i === sheetIdx ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      i === sheetIdx ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Card className="mt-3">
            <Text className="mb-2 text-sm font-semibold">{t('import.preview')}</Text>
            <ScrollView horizontal>
              <View>
                <View className="flex-row">
                  {sheet.headers.map((h) => (
                    <Text
                      key={h}
                      className="min-w-[120px] border-b border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    >
                      {h}
                    </Text>
                  ))}
                </View>
                {sheet.rows.slice(0, 5).map((r, i) => (
                  <View key={i} className="flex-row">
                    {sheet.headers.map((h) => (
                      <Text
                        key={h}
                        numberOfLines={1}
                        className="min-w-[120px] px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
                      >
                        {String(r[h] ?? '')}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
          <View className="mt-3 gap-2">
            <Button
              title={t('import.smart.useAi')}
              loading={aiBusy}
              leftIcon={!aiBusy ? <Ionicons name="sparkles" size={18} color="#fff" /> : undefined}
              onPress={runSmartImport}
            />
            <Button
              title={t('import.smart.useManual')}
              variant="outline"
              onPress={goToMapManual}
            />
          </View>
        </View>
      )}

      {step === 'map' && sheet && (
        <View>
          {aiConfidence !== null && (
            <Card className="mb-3">
              <View className="flex-row items-center gap-2">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50">
                  <Ionicons name="sparkles" size={18} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    {t('import.smart.mappingReady')}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    {t('import.smart.confidence', {
                      percent: Math.round(aiConfidence * 100),
                    })}
                  </Text>
                </View>
              </View>
              {!!aiNotes && (
                <Text className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  {aiNotes}
                </Text>
              )}
              {aiUnmapped.length > 0 && (
                <Text className="mt-2 text-xs text-amber-600">
                  {t('import.smart.unmappedColumns', { cols: aiUnmapped.join(', ') })}
                </Text>
              )}
              <Text className="mt-2 text-xs text-slate-500">
                {t('import.smart.reviewHint')}
              </Text>
            </Card>
          )}
          {SCHEMAS[entity].map((f) => (
            <Select
              key={f.field}
              label={`${f.field}${f.required ? ' *' : ''}`}
              value={mapping[f.field] ?? null}
              options={[
                { label: t('import.noneOption'), value: '' },
                ...sheet.headers.map((h) => ({ label: h, value: h })),
              ]}
              onChange={(v) => setMapping((prev) => ({ ...prev, [f.field]: v || null }))}
            />
          ))}
          <Button title={t('import.validate')} onPress={validate} />
        </View>
      )}

      {step === 'validate' && (
        <View>
          <Card>
            <Text className="text-sm">{t('import.validRows', { count: valid.length })}</Text>
            <Text className="mt-1 text-sm">
              {t('import.skippedRows', { count: errors.length })}
            </Text>
          </Card>
          {errors.length > 0 && (
            <Card className="mt-3">
              <Text className="mb-2 text-sm font-semibold">{t('import.skipped')}</Text>
              <FlatList
                data={errors.slice(0, 30)}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => (
                  <Text className="text-xs text-amber-700">
                    {item.row}: {item.reason}
                  </Text>
                )}
                scrollEnabled={false}
              />
            </Card>
          )}
          <Button
            title={t('import.importN', { count: valid.length })}
            loading={importing}
            onPress={doImport}
            className="mt-3"
          />
        </View>
      )}

      {step === 'done' && (
        <Card>
          <View className="items-center py-6">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <Ionicons name="checkmark" size={28} color="#059669" />
            </View>
            <Text className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-50">
              {t('import.importedN', { count: imported })}
            </Text>
            {errors.length > 0 && (
              <Text className="mt-1 text-xs text-amber-600">
                {t('import.skippedSummary', { count: errors.length })}
              </Text>
            )}
            <Button
              title={t('common.done')}
              className="mt-4"
              onPress={() => router.replace('/(tabs)/dashboard')}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}
