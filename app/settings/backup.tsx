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
      // For now we just alert that it's read successfully
      Alert.alert(
        lang === 'ar' ? 'تم قراءة الملف' : 'File Read Success',
        lang === 'ar' 
          ? `تم العثور على نسخة احتياطية من تاريخ ${new Date(data.timestamp).toLocaleDateString()}\n(ميزة الاستعادة قيد التطوير)`
          : `Found backup from ${new Date(data.timestamp).toLocaleDateString()}\n(Restore feature is in development)`
      );
    } catch (err: any) {
      if (err.message !== 'Canceled') {
        console.error(err);
        Alert.alert(t('common.error'), err.message || 'Import failed');
      }
    } finally {
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
