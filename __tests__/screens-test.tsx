// Renders every screen in German and English, light and dark, and checks that it shows its
// expected text, no "undefined"/"NaN"/"[object Object]", and logs no errors. Runs in the GitHub check.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGS, SCHEMES, renderScreen, settle, visibleText } from '../test/render';
import { strings, type Lang, type Strings } from '@/lib/i18n';

import LoginScreen from '@/app/(auth)/login';
import RegisterScreen from '@/app/(auth)/register';
import ForgotPasswordScreen from '@/app/(auth)/forgot-password';
import ProfileScreen from '@/app/(app)/profile';
import UeberweisenScreen from '@/app/(app)/ueberweisen/index';
import NeueUeberweisungScreen from '@/app/(app)/ueberweisen/neu';
import { SetupNotice } from '@/components/SetupNotice';
import ImpressumScreen from '@/app/legal/impressum';
import DatenschutzScreen from '@/app/legal/datenschutz';

let errors: string[] = [];
beforeEach(async () => {
  await AsyncStorage.clear();
  errors = [];
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const msg = args.map(String).join(' ');
    if (/not wrapped in act/.test(msg)) return;
    errors.push(msg);
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  expect(errors).toEqual([]);
});

type Case = { name: string; Screen: React.ComponentType; expect: (t: Strings, lang: Lang) => string };

const CASES: Case[] = [
  { name: 'Login', Screen: LoginScreen, expect: (t) => t.auth.login.title },
  { name: 'Registrieren', Screen: RegisterScreen, expect: (t) => t.auth.register.consent },
  { name: 'Passwort vergessen', Screen: ForgotPasswordScreen, expect: (t) => t.auth.forgot.title },
  { name: 'Profil', Screen: ProfileScreen, expect: (t) => t.profile.signedInAs },
  { name: 'Überweisen', Screen: UeberweisenScreen, expect: (t) => t.transfer.newTransfer },
  { name: 'Neue Überweisung', Screen: NeueUeberweisungScreen, expect: (t) => t.transfer.recipientTitle },
  { name: 'Setup-Hinweis', Screen: SetupNotice, expect: (t) => t.setup.title },
  { name: 'Impressum', Screen: ImpressumScreen, expect: (t) => t.legal.operatorHeading },
  { name: 'Datenschutz', Screen: DatenschutzScreen, expect: (t) => t.legal.privacySections[3].title },
];

describe.each(LANGS)('every screen renders (%s)', (lang) => {
  const t = strings(lang);
  describe.each(SCHEMES)('%s theme', (scheme) => {
    it.each(CASES.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
      await renderScreen(c.Screen, { lang, scheme });
      expect(screen.getAllByText(c.expect(t, lang)).length).toBeGreaterThan(0);
      const bad = visibleText(screen.toJSON()).filter((s) => /undefined|NaN|\[object Object\]/.test(s));
      expect(bad).toEqual([]);
    });
  });

  it('register asks to confirm the demo notice', async () => {
    await renderScreen(RegisterScreen, { lang });
    fireEvent.changeText(screen.getByPlaceholderText(t.auth.register.namePlaceholder), 'Max');
    fireEvent.changeText(screen.getByPlaceholderText(t.auth.emailPlaceholder), 'max@example.com');
    fireEvent.press(screen.getByText(t.auth.register.submit));
    expect(screen.getByText(t.auth.register.errPassword)).toBeTruthy();
  });

  it('login links to the Impressum and the privacy policy', async () => {
    const router = require('expo-router').__router;
    router.push.mockClear();
    await renderScreen(LoginScreen, { lang });
    fireEvent.press(screen.getByText(t.legal.impressum));
    fireEvent.press(screen.getByText(t.legal.privacy));
    expect(router.push.mock.calls.map((c: unknown[]) => c[0])).toEqual(['/legal/impressum', '/legal/datenschutz']);
  });

  it('legal pages show the operator, or flag that details are missing', async () => {
    const { OPERATOR, isOperatorComplete } = require('@/lib/legal');
    await renderScreen(ImpressumScreen, { lang });
    if (isOperatorComplete) expect(screen.getByText(OPERATOR.email, { exact: false })).toBeTruthy();
    else expect(screen.getByText(t.legal.incomplete)).toBeTruthy();
  });

  it('profile asks on the page before deleting the account', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.rpc.mockReset();
    supabase.rpc.mockImplementation(async () => ({ error: null }));
    await renderScreen(ProfileScreen, { lang });
    fireEvent.press(screen.getByText(t.profile.deleteAccount));
    expect(screen.getByText(t.profile.deleteText)).toBeTruthy();
    expect(supabase.rpc).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText(t.common.cancel));
    expect(screen.queryByText(t.profile.deleteText)).toBeNull();
    fireEvent.press(screen.getByText(t.profile.deleteAccount));
    fireEvent.press(screen.getByText(t.profile.deleteConfirm));
    await settle();
    expect(supabase.rpc).toHaveBeenCalledWith('delete_own_account');
  });
});
