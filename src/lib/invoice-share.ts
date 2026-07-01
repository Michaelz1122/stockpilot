import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { formatDate, formatMoney, formatNumber } from './format';

interface InvoiceLike {
  invoice_number?: string | null;
  invoice_date: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  notes?: string | null;
}

interface ItemLike {
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  line_total: number;
}

export async function shareInvoiceAsText(args: {
  storeName: string;
  storeCurrency: string;
  invoice: InvoiceLike;
  items: ItemLike[];
  partyLabel: string; // "Customer" or "Supplier"
  partyName: string;
  thanksLine: string;
}): Promise<void> {
  const { storeName, storeCurrency, invoice, items, partyLabel, partyName, thanksLine } = args;
  const remaining = Math.max(0, Number(invoice.total) - Number(invoice.paid));
  const sep = '────────────────────────────';
  const lines: string[] = [];
  lines.push(storeName);
  lines.push(sep);
  lines.push(`# ${invoice.invoice_number ?? ''}`);
  lines.push(formatDate(invoice.invoice_date));
  lines.push(`${partyLabel}: ${partyName}`);
  lines.push(sep);
  for (const it of items) {
    lines.push(
      `${it.product_name}  ×${formatNumber(it.quantity)}  =  ${formatMoney(it.line_total, storeCurrency)}`,
    );
  }
  lines.push(sep);
  lines.push(`Subtotal: ${formatMoney(invoice.subtotal, storeCurrency)}`);
  if (Number(invoice.discount) > 0) {
    lines.push(`Discount: ${formatMoney(invoice.discount, storeCurrency)}`);
  }
  lines.push(`TOTAL:    ${formatMoney(invoice.total, storeCurrency)}`);
  lines.push(`Paid:     ${formatMoney(invoice.paid, storeCurrency)}`);
  if (remaining > 0) lines.push(`Due:      ${formatMoney(remaining, storeCurrency)}`);
  if (invoice.notes) {
    lines.push(sep);
    lines.push(invoice.notes);
  }
  lines.push(sep);
  lines.push(thanksLine);

  const body = lines.join('\n');
  const fileName = `invoice-${invoice.invoice_number ?? 'untitled'}.txt`.replace(/\s+/g, '_');
  const uri = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(uri, body, {
    encoding: 'utf8',
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: fileName });
  }
}

export async function sharePaymentAsText(args: {
  storeName: string;
  storeCurrency: string;
  payment: { id: string; amount: number; payment_date: string; notes?: string | null };
  partyLabel: string;
  partyName: string;
  receiptLabel: string;
}): Promise<void> {
  const { storeName, storeCurrency, payment, partyLabel, partyName, receiptLabel } = args;
  const sep = '────────────────────────────';
  const lines: string[] = [];
  lines.push(storeName);
  lines.push(sep);
  lines.push(`${receiptLabel} #${payment.id.slice(0, 8)}`);
  lines.push(formatDate(payment.payment_date));
  lines.push(`${partyLabel}: ${partyName}`);
  lines.push(sep);
  lines.push(`Amount:   ${formatMoney(payment.amount, storeCurrency)}`);
  if (payment.notes) {
    lines.push(sep);
    lines.push(payment.notes);
  }
  lines.push(sep);

  const body = lines.join('\n');
  const fileName = `receipt-${payment.id.slice(0, 8)}.txt`;
  const uri = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(uri, body, {
    encoding: 'utf8',
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: fileName });
  }
}


