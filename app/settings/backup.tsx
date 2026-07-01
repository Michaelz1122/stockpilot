import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useActiveStore } from '@/hooks/useActiveStore';
import { useLocale } from '@/hooks/useLocale';
import { BackupService } from '@/services/backup.service';

export default function BackupScreen() {
  const { t, lang } = useLocale();
  const { storeId } = useActiveStore();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    if (!storeId) return;
    setExporting(true);
    try {
      await BackupService.exportData(storeId);
    } catch (err: any) {
      console.error(err);
      Alert.alert(t('common.error'), err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const data = await BackupService.pickAndReadBackup();
      
      Alert.alert(
        lang === 'ar' ? 'تحذير مهم!' : 'Warning!',
        lang === 'ar'
          ? `سيتم استبدال بيانات المتجر الحالي بالنسخة الاحتياطية من تاريخ ${new Date(data.timestamp).toLocaleDateString()}.\nهل أنت متأكد؟`
          : `Current store data will be overwritten with the backup from ${new Date(data.timestamp).toLocaleDateString()}.\nAre you sure?`,
        [
          { text: lang === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel', onPress: () => setImporting(false) },
          {
            text: lang === 'ar' ? 'استعادة البيانات' : 'Restore Data',
            style: 'destructive',
            onPress: async () => {
              if (!storeId) return;
              try {
                await BackupService.restoreBackup(storeId, data);
                Alert.alert(
                  lang === 'ar' ? 'نجاح' : 'Success',
                  lang === 'ar' ? 'تم استعادة البيانات بنجاح' : 'Data restored successfully'
                );
              } catch (e: any) {
                Alert.alert(t('common.error'), e?.message || 'Restore failed');
              } finally {
                setImporting(false);
              }
            }
          }
        ]
      );
    } catch (err: any) {
      if (err.message !== 'Canceled') {
        console.error(err);
        Alert.alert(t('common.error'), err.message || 'Import failed');
      }
      setImporting(false);
    }
  };

  return (
    <Screen padded>
      <Header title={t('settings.backup') || 'Backup & Restore'} showBack />

      <Card className="bg-card border-border mt-4">
        <Text className="text-lg font-bold text-card-foreground">
          {lang === 'ar' ? 'تصدير البيانات' : 'Export Data'}
        </Text>
        <Text className="text-sm text-muted-foreground mt-2 mb-4">
          {lang === 'ar' 
            ? 'قم بتصدير جميع بيانات المتجر الخاص بك (العملاء، الموردين، المنتجات، الفواتير) إلى ملف JSON.' 
            : 'Export all your store data (customers, suppliers, products, invoices) to a JSON file.'}
        </Text>
        <Button 
          title={lang === 'ar' ? 'تصدير نسخة احتياطية (JSON)' : 'Export Backup (JSON)'} 
          onPress={handleExport}
          loading={exporting}
        />
      </Card>

      <Card className="bg-card border-border mt-6">
        <Text className="text-lg font-bold text-card-foreground">
          {lang === 'ar' ? 'استيراد البيانات' : 'Import Data'}
        </Text>
        <Text className="text-sm text-muted-foreground mt-2 mb-4">
          {lang === 'ar' 
            ? 'قم بقراءة ملف JSON لاستعادة البيانات. هذه الميزة ستستبدل بيانات المتجر الحالي.' 
            : 'Read a JSON file to restore data. This feature will replace current store data.'}
        </Text>
        <Button 
          title={lang === 'ar' ? 'استيراد نسخة احتياطية (JSON)' : 'Import Backup (JSON)'} 
          onPress={handleImport}
          loading={importing}
          variant="outline"
        />
      </Card>
    </Screen>
  );
}
