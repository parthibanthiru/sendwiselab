// International transfers: bank-detail checks per country, the demo quote, the identity check,
// the shared daily limit, and the screens in both languages and themes, including a full
// transfer to India with the demo payout partner.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGS, SCHEMES, renderScreen, settle, visibleText } from '../test/render';
import { strings } from '@/lib/i18n';
import { formatEURCents } from '@/lib/format';
import { checkAnyIban } from '@/lib/iban';
import {
  addIntlTransfer, checkField, checkRecipient, getIdentity, getIntlTransfers, isAbaRouting, isAdult, isIfsc,
  parseBirthDate, saveIdentity, sentTodayCents, COUNTRIES, type IntlTransfer,
} from '@/lib/transfers';
import { DEMO_RATES, demoQuote } from '@/lib/transfers/international/demoPayout';

import AuslandScreen from '@/app/(app)/ueberweisen/ausland';
import IdentitaetScreen from '@/app/(app)/ueberweisen/identitaet';
import UeberweisenScreen from '@/app/(app)/ueberweisen/index';

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

const cleanText = () => visibleText(screen.toJSON()).filter((s) => /undefined|NaN|\[object Object\]/.test(s));

const verifyIdentity = () =>
  saveIdentity({ status: 'verified', fullName: 'Test Nutzer', birthDate: '1990-10-24', street: 'Hauptstr. 1', city: '79100 Freiburg', demo: true });

describe('bank details', () => {
  it('checks IFSC, sort code, ABA routing number and account numbers', () => {
    expect(isIfsc('HDFC0001234')).toBe(true);
    expect(isIfsc('HDFC1001234')).toBe(false);
    expect(checkField('IN', 'ifsc', 'hdfc0001234')).toBeNull();
    expect(checkField('IN', 'accountNumber', '123')).toBe('format');
    expect(checkField('IN', 'accountNumber', '50100234567821')).toBeNull();
    expect(checkField('GB', 'sortCode', '20-00-00')).toBeNull();
    expect(checkField('GB', 'accountNumber', '5577991')).toBe('format');
    expect(isAbaRouting('021000021')).toBe(true);
    expect(checkField('US', 'routingNumber', '021000022')).toBe('checksum');
    expect(checkField('US', 'routingNumber', '1234')).toBe('format');
  });

  it('checks IBANs outside SEPA and that they match the country', () => {
    expect(checkAnyIban('TR33 0006 1005 1978 6457 8413 26').ok).toBe(true);
    expect(checkField('CH', 'iban', 'CH93 0076 2011 6238 5295 7')).toBeNull();
    expect(checkField('TR', 'iban', 'TR330006100519786457841326')).toBeNull();
    expect(checkField('PL', 'iban', 'CH9300762011623852957')).toBe('country');
  });

  it('checks that a SWIFT/BIC belongs to the destination country', () => {
    expect(checkField('SG', 'bic', 'DBSSSGSG')).toBeNull();
    expect(checkField('AU', 'bic', 'DBSSSGSG')).toBe('country');
    expect(checkField('SG', 'bic', 'DBS')).toBe('format');
  });

  it('needs first and last name and every field of the country', () => {
    expect(checkRecipient('IN', 'Priya', { accountNumber: '50100234567821', ifsc: 'HDFC0001234' }).ok).toBe(false);
    expect(checkRecipient('IN', 'Priya Raman', { accountNumber: '50100234567821', ifsc: 'HDFC0001234' }).ok).toBe(true);
    expect(checkRecipient('US', 'Ann Lee', { routingNumber: '021000021', accountNumber: '12345678' }).errors).toEqual({
      accountType: 'required',
      address: 'required',
    });
  });
});

describe('demo quote', () => {
  it('takes the sample fee first and converts the rest', () => {
    const q = demoQuote('IN', 10000)!;
    expect(q.feeCents).toBe(149); // 0.99 € + 0.5 %
    expect(q.receiveMinor).toBe(Math.floor(98.51 * DEMO_RATES.INR * 100));
    expect(q).toMatchObject({ currency: 'INR', delivery: 'minutes', demo: true });
  });
  it('uses whole units for currencies without decimals', () => {
    const q = demoQuote('JP', 10000)!;
    expect(q.decimals).toBe(0);
    expect(q.receiveMinor).toBe(Math.floor(98.51 * DEMO_RATES.JPY));
  });
  it('has a sample rate for every listed country and none for euro countries', () => {
    for (const c of COUNTRIES) expect(DEMO_RATES[c.currency]).toBeGreaterThan(0);
    expect(demoQuote('DE', 10000)).toBeNull();
  });
});

describe('identity and limits', () => {
  it('reads birth dates and requires 18+', () => {
    expect(parseBirthDate('24.10.1990')).toBe('1990-10-24');
    expect(parseBirthDate('5/3/2001')).toBe('2001-03-05');
    expect(parseBirthDate('1990')).toBe('');
    const now = new Date(2026, 9, 24);
    expect(isAdult('2008-10-24', now)).toBe(true);
    expect(isAdult('2008-10-25', now)).toBe(false);
    expect(isAdult('1990-02-31', now)).toBe(false);
  });

  it('counts transfers abroad towards the daily limit', async () => {
    const q = demoQuote('GB', 30000)!;
    const transfer: IntlTransfer = {
      ...q, kind: 'international', id: 'x', name: 'Oliver Grant', account: '20-00-00 · ••9911',
      purpose: 'gift', reference: '', status: 'processing', createdAt: new Date().toISOString(),
    };
    await addIntlTransfer(transfer);
    expect(await sentTodayCents()).toBe(30000);
  });
});

describe.each(LANGS)('international screens (%s)', (lang) => {
  const t = strings(lang);

  describe.each(SCHEMES)('%s theme', (scheme) => {
    it('send abroad starts with destination and amount', async () => {
      await renderScreen(AuslandScreen, { lang, scheme });
      expect(screen.getByText(t.intl.whereTitle)).toBeTruthy();
      expect(screen.getByText(t.countries.IN)).toBeTruthy();
      fireEvent.changeText(screen.getByTestId('intl-amount'), '100');
      await settle();
      expect(screen.getByText(t.intl.recipientGets)).toBeTruthy();
      expect(screen.getByText(t.intl.sampleNote)).toBeTruthy();
      expect(cleanText()).toEqual([]);
    });

    it('identity check renders', async () => {
      await renderScreen(IdentitaetScreen, { lang, scheme });
      expect(screen.getByText(t.identity.intro)).toBeTruthy();
      expect(cleanText()).toEqual([]);
    });
  });

  it('overview offers sending abroad', async () => {
    await renderScreen(UeberweisenScreen, { lang });
    fireEvent.press(screen.getByText(t.intl.entry));
    expect(require('expo-router').__router.push).toHaveBeenCalledWith('/ueberweisen/ausland');
  });

  it('identity check refuses under-18s and accepts adults', async () => {
    await renderScreen(IdentitaetScreen, { lang });
    expect(screen.getByTestId('id-name').props.value).toBe('Test Nutzer'); // prefilled from the profile
    fireEvent.changeText(screen.getByTestId('id-birth'), '01.01.2020');
    fireEvent.changeText(screen.getByTestId('id-street'), 'Hauptstraße 1');
    fireEvent.changeText(screen.getByTestId('id-city'), '79100 Freiburg');
    fireEvent.press(screen.getByText(t.identity.submit));
    await settle();
    expect(screen.getByText(t.identity.errors.underage)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('id-birth'), '24.10.1990');
    fireEvent.press(screen.getByText(t.identity.submit));
    await settle();
    expect(screen.getByText(t.identity.verified)).toBeTruthy();
    expect((await getIdentity()).status).toBe('verified');
  });

  it('blocks sending until the identity is confirmed', async () => {
    await renderScreen(AuslandScreen, { lang });
    fireEvent.changeText(screen.getByTestId('intl-amount'), '100');
    await settle();
    fireEvent.press(screen.getByText(t.transfer.continue));
    fireEvent.press(screen.getByText('Priya Raman'));
    await settle();
    expect(screen.getByText(t.intl.identityNeeded)).toBeTruthy();
    fireEvent.press(screen.getByText(t.intl.send(formatEURCents(100))));
    await settle();
    expect(await getIntlTransfers()).toEqual([]);
  });

  it('sends to a saved recipient in India end to end', async () => {
    await verifyIdentity();
    await renderScreen(AuslandScreen, { lang });
    fireEvent.changeText(screen.getByTestId('intl-amount'), '100');
    await settle();
    fireEvent.press(screen.getByText(t.transfer.continue));
    fireEvent.press(screen.getByText('Priya Raman'));
    await settle();
    expect(screen.getByText(t.intl.identityDone)).toBeTruthy();
    expect(screen.getByText(t.intl.firstTransfer)).toBeTruthy();
    fireEvent.press(screen.getByText(t.intl.purposes.gift));
    fireEvent.press(screen.getByText(t.intl.send(formatEURCents(100))));
    await settle();
    expect(screen.getByText(t.intl.doneTitle)).toBeTruthy();
    expect(cleanText()).toEqual([]);

    const [sent] = await getIntlTransfers();
    expect(sent).toMatchObject({
      name: 'Priya Raman', country: 'IN', currency: 'INR', sendCents: 10000, feeCents: 149,
      purpose: 'gift', status: 'processing', demo: true,
    });
    expect(await sentTodayCents()).toBe(10000);
  });

  it('checks a new US recipient’s bank details', async () => {
    await renderScreen(AuslandScreen, { lang });
    fireEvent.press(screen.getByTestId('intl-change-country'));
    fireEvent.changeText(screen.getByTestId('intl-country-search'), 'usd');
    fireEvent.press(screen.getByText(t.countries.US));
    fireEvent.changeText(screen.getByTestId('intl-amount'), '50');
    await settle();
    fireEvent.press(screen.getByText(t.transfer.continue));
    fireEvent.changeText(screen.getByTestId('intl-name'), 'Ann Lee');
    fireEvent.changeText(screen.getByTestId('intl-routingNumber'), '021000022');
    fireEvent.changeText(screen.getByTestId('intl-accountNumber'), '12345678');
    fireEvent.press(screen.getByText(t.transfer.continue));
    await settle();
    expect(screen.getByText(t.intl.fieldErrors.checksum)).toBeTruthy();
    expect(screen.getAllByText(t.intl.fieldErrors.required).length).toBe(2); // account type, address
    expect(screen.getByText(t.intl.recipientTitle)).toBeTruthy();
  });
});
