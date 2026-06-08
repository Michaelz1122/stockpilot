import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import 'intl-pluralrules';
import en from './locales/en';
import ar from './locales/ar';

export const LANG_STORAGE_KEY = 'sp.lang';
export const LANG_INITIALIZED_KEY = 'sp.langInitialized';

export type SupportedLang = 'ar' | 'en';

export const SUPPORTED_LANGS: SupportedLang[] = ['ar', 'en'];
export const DEFAULT_LANG: SupportedLang = 'ar';

export function isRTL(lang: SupportedLang) {
  return lang === 'ar';
}

let initialized = false;

export async function initI18n(): Promise<{
  language: SupportedLang | null;
  firstLaunch: boolean;
}> {
  if (initialized) {
    const lang = (i18n.language as SupportedLang) ?? DEFAULT_LANG;
    return { language: lang, firstLaunch: false };
  }
  const stored = (await AsyncStorage.getItem(LANG_STORAGE_KEY)) as
    | SupportedLang
    | null;
  const flagged = await AsyncStorage.getItem(LANG_INITIALIZED_KEY);
  const language = stored ?? DEFAULT_LANG;

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
    returnNull: false,
  });

  const wantRTL = isRTL(language);
  if (I18nManager.isRTL !== wantRTL) {
    try {
      I18nManager.allowRTL(wantRTL);
      I18nManager.forceRTL(wantRTL);
    } catch {}
  }

  initialized = true;
  return { language: stored, firstLaunch: !flagged };
}

export async function setLanguage(lang: SupportedLang): Promise<{
  requiresRestart: boolean;
}> {
  await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  await AsyncStorage.setItem(LANG_INITIALIZED_KEY, '1');
  await i18n.changeLanguage(lang);
  const wantRTL = isRTL(lang);
  const requiresRestart = I18nManager.isRTL !== wantRTL;
  if (requiresRestart) {
    try {
      I18nManager.allowRTL(wantRTL);
      I18nManager.forceRTL(wantRTL);
    } catch {}
  }
  return { requiresRestart };
}

export function currentLang(): SupportedLang {
  return (i18n.language as SupportedLang) ?? DEFAULT_LANG;
}

export default i18n;
