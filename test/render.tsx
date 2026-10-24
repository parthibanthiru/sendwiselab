// Test helper: renders a screen inside the app's real providers (auth) with a
// fixed language and theme, waits for its async loading, and collects all visible text.
import React from 'react';
import { act, render } from '@testing-library/react-native';
import { AuthProvider } from '@/context/AuthProvider';
import { LanguageContext, setCurrentLang, strings, type Lang } from '@/lib/i18n';
import { ThemeContext, palettes, type Scheme } from '@/components/theme';

export const LANGS: Lang[] = ['de', 'en'];
export const SCHEMES: Scheme[] = ['light', 'dark'];

export function Providers({ lang, scheme, children }: { lang: Lang; scheme: Scheme; children: React.ReactNode }) {
  setCurrentLang(lang);
  const i18n = { lang, t: strings(lang), preference: lang, setPreference: () => {} };
  const theme = { colors: palettes[scheme], scheme, preference: scheme, setPreference: () => {} };
  return (
    <ThemeContext.Provider value={theme}>
      <LanguageContext.Provider value={i18n}>
        <AuthProvider>{children}</AuthProvider>
      </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
}

/** Lets pending promises (session, data, storage) settle inside act(). */
export async function settle(rounds = 3) {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

export async function renderScreen(
  Screen: React.ComponentType,
  { lang, scheme = 'light', params = {} }: { lang: Lang; scheme?: Scheme; params?: Record<string, string> }
) {
  require('expo-router').__setParams(params);
  const utils = render(
    <Providers lang={lang} scheme={scheme}>
      <Screen />
    </Providers>
  );
  await settle();
  return utils;
}

/** Every string rendered on screen (Text children), flattened. */
export function visibleText(tree: unknown): string[] {
  const out: string[] = [];
  const walk = (node: any) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') out.push(String(node));
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node.children) node.children.forEach(walk);
  };
  walk(tree);
  return out;
}
