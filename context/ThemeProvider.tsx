import React, { useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Scheme, ThemeContext, ThemePreference, palettes } from '@/components/theme';

// Stored theme choice:
// "light" / "dark" = chosen by the user, nothing stored = follow the system.
const KEY = 'mt-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // updates live when the phone switches light/dark
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark') setPreferenceState(v);
      })
      .catch(() => {});
  }, []);

  function setPreference(p: ThemePreference) {
    setPreferenceState(p);
    (p === 'system' ? AsyncStorage.removeItem(KEY) : AsyncStorage.setItem(KEY, p)).catch(() => {});
  }

  const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(
    () => ({ colors: palettes[scheme], scheme, preference, setPreference }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
