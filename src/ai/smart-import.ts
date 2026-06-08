import { getAIProvider } from './index';
import type { ImportEntity, ColumnMapping } from '@/services/excel.service';
import { SCHEMAS } from '@/services/excel.service';

export interface SmartMappingResult {
  mapping: ColumnMapping;
  detectedEntity?: ImportEntity;
  confidence: number;
  notes: string;
  unmapped: string[];
}

export async function smartMapColumns(
  entity: ImportEntity,
  headers: string[],
  sampleRows: Record<string, unknown>[],
  storeId: string,
): Promise<SmartMappingResult> {
  const schema = SCHEMAS[entity];
  const targetFields = schema.map((f) => ({
    field: f.field,
    required: !!f.required,
    type: f.type ?? 'text',
    aliases: f.aliases,
  }));

  const sample = sampleRows.slice(0, 5).map((r) => {
    const out: Record<string, unknown> = {};
    for (const h of headers) out[h] = r[h];
    return out;
  });

  const systemPrompt = `You are a data import assistant for an Egyptian retail ERP system. Users upload Excel files in Arabic or English. Your job is to map each column header to one of the target fields based on the header name AND the actual sample data.

Rules:
- Return STRICT JSON only, no markdown, no commentary.
- Schema: { "mapping": { "<target_field>": "<source_header_or_null>" }, "confidence": 0.0-1.0, "notes": "<short reason in Arabic>" }
- A target field may be unmapped (set to null) if no column fits.
- Inspect the sample VALUES — if a column contains numbers and the target field is a number type, that's a strong signal. If it contains Arabic names of products, map to "name". If it contains phone numbers (starts with 01), map to "phone". Etc.
- Be tolerant of Arabic variants: مفتاح/مفاتيح، كود/الكود، اسم/الاسم.
- "confidence" reflects how sure you are overall.
- "notes" should be 1-2 sentences max, in Arabic, explaining ambiguities.`;

  const userPrompt = `Target entity: ${entity}

Target fields (map each to a source header, or null):
${targetFields
  .map(
    (f) =>
      `- "${f.field}"${f.required ? ' (REQUIRED)' : ''} | type: ${f.type} | hints: ${f.aliases.join(', ')}`,
  )
  .join('\n')}

Source headers from the Excel:
${JSON.stringify(headers)}

Sample data (first ${sample.length} rows):
${JSON.stringify(sample, null, 2)}

Return the JSON now.`;

  const provider = getAIProvider();
  const res = await provider.send({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    tools: [],
    context: { storeId, lang: 'ar' },
  });

  // Strip code fences if any, then parse
  let txt = res.reply.trim();
  txt = txt.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
  const firstBrace = txt.indexOf('{');
  const lastBrace = txt.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    txt = txt.slice(firstBrace, lastBrace + 1);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(txt);
  } catch {
    return {
      mapping: {},
      confidence: 0,
      notes: 'تعذر تحليل رد الـ AI، استخدم التعيين اليدوي.',
      unmapped: headers,
    };
  }

  const aiMapping = (parsed.mapping ?? {}) as Record<string, string | null>;
  // Validate: every value must be either null or one of the headers
  const mapping: ColumnMapping = {};
  for (const f of schema) {
    const v = aiMapping[f.field];
    if (typeof v === 'string' && headers.includes(v)) {
      mapping[f.field] = v;
    } else {
      mapping[f.field] = null;
    }
  }
  const usedHeaders = new Set(Object.values(mapping).filter(Boolean) as string[]);
  const unmapped = headers.filter((h) => !usedHeaders.has(h));

  return {
    mapping,
    confidence: Number(parsed.confidence ?? 0.7),
    notes: String(parsed.notes ?? ''),
    unmapped,
  };
}

/** Detect which entity the sheet most likely represents (products, customers, ...) */
export async function detectImportEntity(
  headers: string[],
  sampleRows: Record<string, unknown>[],
  storeId: string,
): Promise<{ entity: ImportEntity; confidence: number; notes: string }> {
  const provider = getAIProvider();
  const systemPrompt = `You classify Excel sheets uploaded to an Egyptian retail ERP. Output STRICT JSON only.
Schema: { "entity": "products|customers|suppliers|inventory|price_list", "confidence": 0.0-1.0, "notes": "<Arabic 1 sentence>" }`;
  const userPrompt = `Pick the best entity for this sheet.

Headers: ${JSON.stringify(headers)}
Sample rows: ${JSON.stringify(sampleRows.slice(0, 5))}

Hints:
- products = items with prices, SKU, barcode, category, stock
- customers = people/companies with phone/address that BUY from us
- suppliers = vendors/companies we BUY from
- inventory = stock movements (IN/OUT/ADJUSTMENT) per SKU
- price_list = SKU + new sale price only

Return JSON.`;

  const res = await provider.send({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    tools: [],
    context: { storeId, lang: 'ar' },
  });
  let txt = res.reply.trim();
  txt = txt.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
  const i = txt.indexOf('{');
  const j = txt.lastIndexOf('}');
  if (i >= 0 && j > i) txt = txt.slice(i, j + 1);
  try {
    const parsed = JSON.parse(txt);
    const allowed: ImportEntity[] = ['products', 'customers', 'suppliers', 'inventory', 'price_list'];
    const entity = allowed.includes(parsed.entity) ? parsed.entity : 'products';
    return {
      entity: entity as ImportEntity,
      confidence: Number(parsed.confidence ?? 0.6),
      notes: String(parsed.notes ?? ''),
    };
  } catch {
    return { entity: 'products', confidence: 0, notes: '' };
  }
}
