import type { AIProvider, AIRequest, AIResponse } from '../types';
import { formatMoney, formatNumber } from '@/lib/format';
import { normalizeArabic } from '@/lib/arabic';
import i18n from '@/i18n';

interface Rule {
  keywords: string[];
  tool: string;
  arg?: (msg: string) => Record<string, unknown>;
}

const RULES: Rule[] = [
  { keywords: ['low stock', 'out of stock', 'منخفض', 'الحد الادني', 'نفذ', 'ناقص', 'قليل'], tool: 'low_stock' },
  { keywords: ['top customer', 'best customer', 'افضل عميل', 'افضل العملاء', 'اهم العملاء', 'top'], tool: 'top_customers' },
  { keywords: ['today', 'sales today', 'مبيعات اليوم', 'بعت النهارده', 'النهاردة', 'اليوم'], tool: 'sales_today' },
  { keywords: ['dashboard', 'summary', 'kpi', 'لوحه', 'ملخص', 'تقرير اليوم'], tool: 'dashboard_summary' },
];

const FIND_RULES: Rule[] = [
  {
    keywords: ['customer', 'عميل', 'الزبون', 'رصيد عميل'],
    tool: 'find_customer',
    arg: (m) => ({ query: extractQuery(m, ['عميل', 'الزبون', 'customer', 'for', 'of', 'اسم']) }),
  },
  {
    keywords: ['supplier', 'مورد', 'البائع'],
    tool: 'find_supplier',
    arg: (m) => ({ query: extractQuery(m, ['مورد', 'البائع', 'supplier', 'for', 'of']) }),
  },
  {
    keywords: ['product', 'item', 'صنف', 'منتج', 'موديل', 'كام', 'how many', 'how much', 'stock of', 'units of', 'عندي كام'],
    tool: 'find_product',
    arg: (m) => ({ query: extractQuery(m, ['من', 'صنف', 'منتج', 'product', 'item', 'of', 'for']) }),
  },
];

function extractQuery(msg: string, after: string[]): string {
  const quoted = msg.match(/["'""„""«»]([^"'""„""«»]+)["'""„""«»]/);
  if (quoted) return quoted[1].trim();
  const normalized = msg.trim();
  for (const word of after) {
    const re = new RegExp(`${word}\\s+([\\p{L}\\p{N}\\-_. ]{2,40})`, 'iu');
    const m = normalized.match(re);
    if (m) return m[1].trim();
  }
  // fallback: last 3 meaningful tokens, stripping question marks
  const tokens = normalized
    .replace(/[؟?،,.]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return tokens.slice(-3).join(' ');
}

function tt(key: string, params?: Record<string, unknown>): string {
  return i18n.t(key, params) as string;
}

function formatResult(tool: string, result: unknown): string {
  if (!result) return tt('ai.noData');
  if (Array.isArray(result)) {
    if (result.length === 0) return tt('ai.noMatches');
    if (tool === 'low_stock') {
      return (
        tt('ai.lowStockHeading') +
        '\n' +
        result
          .slice(0, 10)
          .map(
            (p: any) =>
              `• ${p.name} — ${formatNumber(p.current_stock ?? 0)} (${tt('ai.minSuffix', { n: formatNumber(p.minimum_stock) })})`,
          )
          .join('\n')
      );
    }
    if (tool === 'top_customers') {
      return (
        tt('ai.topCustomersHeading') +
        '\n' +
        result
          .map(
            (r: any, i: number) =>
              `${i + 1}. ${r.customer.name} — ${formatMoney(r.total)}`,
          )
          .join('\n')
      );
    }
    if (tool === 'find_product') {
      return result
        .map(
          (p: any) =>
            `• ${p.name} — ${tt('ai.stockSuffix', { n: formatNumber(p.current_stock ?? 0) })}, ${tt('ai.priceSuffix', { price: formatMoney(p.sale_price) })}`,
        )
        .join('\n');
    }
    if (tool === 'find_customer') {
      return result
        .map(
          (c: any) =>
            `• ${c.name} — ${tt('ai.balanceSuffix', { balance: formatMoney(c.balance ?? 0) })}`,
        )
        .join('\n');
    }
    if (tool === 'find_supplier') {
      return result
        .map(
          (s: any) =>
            `• ${s.name} — ${tt('ai.balanceSuffix', { balance: formatMoney(s.balance ?? 0) })}`,
        )
        .join('\n');
    }
    return result.map((r) => `• ${JSON.stringify(r)}`).join('\n');
  }
  if (tool === 'sales_today') {
    const r = result as any;
    return tt('ai.todaySummary', { count: r.count, total: formatMoney(r.total) });
  }
  if (tool === 'dashboard_summary') {
    const r = result as any;
    return [
      tt('ai.dashboard.products', { n: r.totalProducts }),
      tt('ai.dashboard.customers', { n: r.totalCustomers }),
      tt('ai.dashboard.suppliers', { n: r.totalSuppliers }),
      tt('ai.dashboard.inventoryValue', { value: formatMoney(r.inventoryValue) }),
      tt('ai.dashboard.lowStock', { n: r.lowStockCount }),
      tt('ai.dashboard.revenue', { value: formatMoney(r.revenue30d) }),
      tt('ai.dashboard.profit', { value: formatMoney(r.profit30d) }),
    ].join('\n');
  }
  return JSON.stringify(result);
}

export const LocalProvider: AIProvider = {
  name: 'local',
  async send(req: AIRequest): Promise<AIResponse> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
    const rawMsg = lastUser?.content ?? '';
    const normalized = normalizeArabic(rawMsg).toLowerCase();
    const tools = req.tools ?? [];

    let chosen: Rule | null = null;
    let score = 0;
    for (const r of [...RULES, ...FIND_RULES]) {
      const s = r.keywords.reduce((acc, kw) => {
        const k = normalizeArabic(kw).toLowerCase();
        return acc + (normalized.includes(k) ? 1 : 0);
      }, 0);
      if (s > score) {
        score = s;
        chosen = r;
      }
    }
    if (!chosen) {
      return { reply: tt('ai.help') };
    }
    const tool = tools.find((t) => t.name === chosen!.tool);
    if (!tool) return { reply: tt('ai.toolNotRegistered') };
    const args = chosen.arg ? chosen.arg(rawMsg) : {};
    const result = await tool.handler(args);
    return {
      reply: formatResult(chosen.tool, result),
      toolCalls: [{ name: chosen.tool, args, result }],
    };
  },
};
