// Language handling: German (default) and English.
//
// Components read text with `const t = useT()` (re-renders on a language change).
// Code outside components (auth error messages, number formatting, data loading) reads the
// current language via getLang() / strings(); LanguageProvider keeps it up to date.
import { createContext, useContext } from 'react';
import { de, type Strings } from './strings/de';
import { en } from './strings/en';

export type Lang = 'de' | 'en';
export type LangPreference = 'system' | Lang;
export type { Strings };

/** Phone language: English phones get English, everything else German. */
export function detectSystemLang(): Lang {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return locale.toLowerCase().startsWith('en') ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

let current: Lang = detectSystemLang();

export const getLang = () => current;
/** Called by LanguageProvider only. */
export const setCurrentLang = (lang: Lang) => {
  current = lang;
};

export const strings = (lang: Lang = current): Strings => (lang === 'en' ? en : de);

/** Locale for numbers and dates (en-IE: "€1,234.50"). */
export const locale = (lang: Lang = current) => (lang === 'en' ? 'en-IE' : 'de-DE');

export type I18n = {
  lang: Lang;
  t: Strings;
  preference: LangPreference;
  setPreference: (p: LangPreference) => void;
};

export const LanguageContext = createContext<I18n>({
  lang: current,
  t: strings(current),
  preference: 'system',
  setPreference: () => {},
});

export const useI18n = () => useContext(LanguageContext);
export const useT = () => useContext(LanguageContext).t;
export const useLang = () => useContext(LanguageContext).lang;
