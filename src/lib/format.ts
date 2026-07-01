export function formatMoney(value: number, currency = 'EGP'): string {
  if (!isFinite(value)) value = 0;
  const fixed = value.toFixed(2);
  const [whole, fraction] = fixed.split('.');
  const withSep = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${withSep}.${fraction} ${currency}`;
}

export function formatNumber(value: number): string {
  if (!isFinite(value)) value = 0;
  return value.toLocaleString();
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
