import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export type ImportEntity =
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'inventory'
  | 'price_list';

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface ColumnMapping {
  [targetField: string]: string | null; // target -> source header
}

export interface ImportPreview {
  fileName: string;
  sheets: ParsedSheet[];
}

export const SCHEMAS: Record<
  ImportEntity,
  { field: string; required?: boolean; aliases: string[]; type?: 'number' }[]
> = {
  products: [
    { field: 'name', required: true, aliases: ['name', 'product', 'product name', 'الاسم', 'المنتج'] },
    { field: 'sku', aliases: ['sku', 'code', 'كود', 'الكود'] },
    { field: 'barcode', aliases: ['barcode', 'باركود'] },
    { field: 'category', aliases: ['category', 'cat', 'التصنيف', 'الفئة'] },
    { field: 'description', aliases: ['description', 'desc', 'الوصف'] },
    { field: 'purchase_price', type: 'number', aliases: ['purchase', 'cost', 'purchase price', 'سعر الشراء', 'تكلفة'] },
    { field: 'sale_price', type: 'number', aliases: ['sale', 'price', 'sale price', 'سعر البيع', 'البيع'] },
    { field: 'minimum_stock', type: 'number', aliases: ['min', 'minimum', 'min stock', 'الحد الأدنى'] },
    { field: 'opening_stock', type: 'number', aliases: ['stock', 'qty', 'quantity', 'opening', 'الكمية', 'الرصيد'] },
  ],
  customers: [
    { field: 'name', required: true, aliases: ['name', 'customer', 'العميل', 'الاسم'] },
    { field: 'phone', aliases: ['phone', 'mobile', 'الهاتف', 'الجوال'] },
    { field: 'address', aliases: ['address', 'العنوان'] },
    { field: 'notes', aliases: ['notes', 'ملاحظات'] },
    { field: 'opening_balance', type: 'number', aliases: ['balance', 'opening', 'الرصيد'] },
  ],
  suppliers: [
    { field: 'name', required: true, aliases: ['name', 'supplier', 'المورد', 'الاسم'] },
    { field: 'phone', aliases: ['phone', 'mobile', 'الهاتف'] },
    { field: 'address', aliases: ['address', 'العنوان'] },
    { field: 'notes', aliases: ['notes', 'ملاحظات'] },
    { field: 'opening_balance', type: 'number', aliases: ['balance', 'opening', 'الرصيد'] },
  ],
  inventory: [
    { field: 'sku', required: true, aliases: ['sku', 'code', 'كود'] },
    { field: 'quantity', required: true, type: 'number', aliases: ['qty', 'quantity', 'الكمية'] },
    { field: 'type', aliases: ['type', 'movement', 'حركة'] },
    { field: 'unit_cost', type: 'number', aliases: ['cost', 'unit cost', 'التكلفة'] },
    { field: 'note', aliases: ['note', 'notes', 'ملاحظة'] },
  ],
  price_list: [
    { field: 'sku', required: true, aliases: ['sku', 'code', 'كود'] },
    { field: 'sale_price', required: true, type: 'number', aliases: ['price', 'sale', 'البيع'] },
  ],
};

export const ExcelService = {
  async pickFile(): Promise<ImportPreview | null> {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        '*/*',
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    const asset = res.assets[0];
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const wb = XLSX.read(base64, { type: 'base64' });
    const sheets: ParsedSheet[] = wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: '',
        raw: false,
      });
      const headers =
        json.length > 0
          ? Object.keys(json[0])
          : (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] as string[]) ?? [];
      return { name, headers, rows: json };
    });
    return { fileName: asset.name, sheets };
  },

  autoMap(entity: ImportEntity, headers: string[]): ColumnMapping {
    const schema = SCHEMAS[entity];
    const map: ColumnMapping = {};
    const norm = (s: string) =>
      s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[_-]+/g, ' ');
    const normalized = headers.map((h) => ({ raw: h, n: norm(h) }));
    for (const f of schema) {
      let found: string | null = null;
      for (const alias of f.aliases) {
        const aN = norm(alias);
        const hit = normalized.find((h) => h.n === aN || h.n.includes(aN));
        if (hit) {
          found = hit.raw;
          break;
        }
      }
      map[f.field] = found;
    }
    return map;
  },

  applyMapping<T extends Record<string, any>>(
    entity: ImportEntity,
    rows: Record<string, unknown>[],
    mapping: ColumnMapping,
  ): { valid: T[]; errors: Array<{ row: number; reason: string }> } {
    const schema = SCHEMAS[entity];
    const valid: T[] = [];
    const errors: Array<{ row: number; reason: string }> = [];
    rows.forEach((row, idx) => {
      const out: Record<string, any> = {};
      let rowError: string | null = null;
      for (const f of schema) {
        const source = mapping[f.field];
        if (!source) {
          if (f.required) rowError = `Missing required field "${f.field}"`;
          continue;
        }
        const raw = row[source];
        if (f.type === 'number') {
          const n = Number(String(raw ?? '').replace(/,/g, ''));
          out[f.field] = isFinite(n) ? n : 0;
        } else {
          const v = raw === undefined || raw === null ? '' : String(raw).trim();
          if (f.required && !v) rowError = `"${f.field}" is required`;
          out[f.field] = v || null;
        }
      }
      if (rowError) errors.push({ row: idx + 2, reason: rowError });
      else valid.push(out as T);
    });
    return { valid, errors };
  },

  async exportToFile(
    fileName: string,
    rows: Record<string, unknown>[],
    sheetName = 'Sheet1',
  ): Promise<string> {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const wbBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = FileSystem.cacheDirectory + fileName;
    await FileSystem.writeAsStringAsync(uri, wbBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: fileName,
      });
    }
    return uri;
  },
};
