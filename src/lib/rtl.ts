import { I18nManager } from 'react-native';
import { currentLang, isRTL as langIsRTL } from '@/i18n';

export function isRTL(): boolean {
  // Trust language-driven RTL even before native flip propagates.
  return I18nManager.isRTL || langIsRTL(currentLang());
}

export function dir(): 'rtl' | 'ltr' {
  return isRTL() ? 'rtl' : 'ltr';
}

export function flipForRTL<T>(ltr: T, rtl: T): T {
  return isRTL() ? rtl : ltr;
}
