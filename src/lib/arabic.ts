// Arabic normalization for search.
// Folds alef variants → ا, ya variants → ي, ta marbuta → ه, removes tashkeel
// and tatweel, normalizes hamza forms, strips non-letters/whitespace.

const TASHKEEL_RE = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;
const TATWEEL = /ـ/g;

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export function normalizeArabic(input: string | null | undefined): string {
  if (!input) return '';
  let s = String(input).toLowerCase();
  s = s.replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d] ?? d);
  s = s.replace(TASHKEEL_RE, '');
  s = s.replace(TATWEEL, '');
  s = s.replace(/[إأآا]/g, 'ا');
  s = s.replace(/[ى]/g, 'ي');
  s = s.replace(/[ؤ]/g, 'و');
  s = s.replace(/[ئ]/g, 'ي');
  s = s.replace(/[ة]/g, 'ه');
  s = s.replace(/[ـ]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Tokenize a query so "مفتاح بريزة" matches any record containing both tokens
export function matches(haystack: string, needle: string): boolean {
  const H = normalizeArabic(haystack);
  const N = normalizeArabic(needle);
  if (!N) return true;
  const tokens = N.split(/\s+/).filter(Boolean);
  return tokens.every((t) => H.includes(t));
}

// Fast multi-field matcher
export function matchesAny(fields: Array<string | null | undefined>, needle: string): boolean {
  const joined = fields.filter(Boolean).map((f) => normalizeArabic(f!)).join(' | ');
  return matches(joined, needle);
}
