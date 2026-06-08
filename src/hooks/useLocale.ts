import { useTranslation } from 'react-i18next';
import { currentLang, isRTL as langIsRTL, type SupportedLang } from '@/i18n';
import { isRTL } from '@/lib/rtl';

export function useLocale() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language as SupportedLang) ?? currentLang();
  return {
    t,
    lang,
    isRTL: isRTL(),
    isArabic: langIsRTL(lang),
    direction: (isRTL() ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  };
}
