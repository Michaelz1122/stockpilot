import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { sb } from '@/repositories/base';

export interface BackupData {
  version: string;
  timestamp: string;
  storeId: string;
  data: {
    customers?: any[];
    suppliers?: any[];
    products?: any[];
    product_units?: any[];
    sales_invoices?: any[];
    sales_invoice_items?: any[];
    purchase_invoices?: any[];
    purchase_invoice_items?: any[];
    inventory_transactions?: any[];
    payments?: any[];
  };
}

export const BackupService = {
  async exportData(storeId: string): Promise<void> {
    const backup: BackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      storeId,
      data: {},
    };

    // Fetch all data for this store
    const tables = [
      'customers',
      'suppliers',
      'products',
      'product_units',
      'sales_invoices',
      'sales_invoice_items',
      'purchase_invoices',
      'purchase_invoice_items',
      'inventory_transactions',
      'payments',
    ];

    for (const table of tables) {
      // NOTE: For tables without store_id directly (like items), we might need complex queries.
      // But actually, in our schema, almost all tables have store_id, or we can fetch them via their parents.
      // Let's assume all main tables have store_id except the items tables which we'll join or just fetch everything where store_id matches.
      // Wait, sales_invoice_items doesn't have store_id. We fetch it via invoice_id.
      
      if (['sales_invoice_items', 'purchase_invoice_items'].includes(table)) {
        // Fetch via parent invoice
        const parentTable = table.replace('_items', 's');
        const { data } = await sb()
          .from(table as any)
          .select(`*, ${parentTable}!inner(store_id)`)
          .eq(`${parentTable}.store_id`, storeId);
        
        // Remove the joined parent data before saving
        backup.data[table as keyof typeof backup.data] = (data || []).map(row => {
          const { [parentTable]: _, ...rest } = row as any;
          return rest;
        });
      } else if (table === 'product_units') {
        const { data } = await sb()
          .from(table as any)
          .select('*, products!inner(store_id)')
          .eq('products.store_id', storeId);
        backup.data.product_units = (data || []).map(row => {
          const { products: _, ...rest } = row as any;
          return rest;
        });
      } else {
        const { data } = await sb()
          .from(table as any)
          .select('*')
          .eq('store_id', storeId);
        backup.data[table as keyof typeof backup.data] = data || [];
      }
    }

    const json = JSON.stringify(backup, null, 2);
    // @ts-ignore
    const filename = `backup_${storeId.slice(0, 8)}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    // @ts-ignore
    const fileUri = FileSystem.documentDirectory + filename;

    // @ts-ignore
    await FileSystem.writeAsStringAsync(fileUri, json, {
      // @ts-ignore
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export StockPilot Backup',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  },

  async pickAndReadBackup(): Promise<BackupData> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      throw new Error('Canceled');
    }

    // @ts-ignore
    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
      // @ts-ignore
      encoding: FileSystem.EncodingType.UTF8,
    });

    try {
      const data = JSON.parse(fileContent);
      if (!data.version || !data.data) {
        throw new Error('Invalid backup file format');
      }
      return data as BackupData;
    } catch (e) {
      throw new Error('Failed to parse backup file');
    }
  }
};
