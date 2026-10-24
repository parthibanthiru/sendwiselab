import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang, LangPreference, LanguageContext, detectSystemLang, setCurrentLang, strings } from '@/lib/i18n';

// Stored choice: "de" / "en"; nothing stored = follow the phone's language.
const KEY = 'mt-lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<LangPreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'de' || v === 'en') setPreferenceState(v);
      })
      .catch(() => {});
  }, []);

  function setPreference(p: LangPreference) {
    setPreferenceState(p);
    (p === 'system' ? AsyncStorage.removeItem(KEY) : AsyncStorage.setItem(KEY, p)).catch(() => {});
  }

  const lang: Lang = preference === 'system' ? detectSystemLang() : preference;
  // Set before the children render, so non-React code (formatting, data loading) matches.
  setCurrentLang(lang);

  const value = useMemo(
    () => ({ lang, t: strings(lang), preference, setPreference }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, preference]
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
