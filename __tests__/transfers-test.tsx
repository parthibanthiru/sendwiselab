// Transfers: IBAN check, amount limits, simulated payee check, and the
// screens in both languages and themes, including a full transfer with the demo provider.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGS, SCHEMES, renderScreen, settle, visibleText } from '../test/render';
import { setCurrentLang, strings } from '@/lib/i18n';
import { checkIban, formatIban, maskIban } from '@/lib/iban';
import { formatEURCents } from '@/lib/format';
import { LIMITS, checkAmount, getTransfers, isKnownPayee, sentTodayCents } from '@/lib/transfers';
import { demoPayeeCheck } from '@/lib/transfers/demoProvider';

import UeberweisenScreen from '@/app/(app)/ueberweisen/index';
import NeueUeberweisungScreen from '@/app/(app)/ueberweisen/neu';

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

describe('IBAN', () => {
  it('accepts valid SEPA IBANs with or without spaces', () => {
    expect(checkIban('DE89 3704 0044 0532 0130 00').ok).toBe(true);
    expect(checkIban('de89370400440532013000').ok).toBe(true);
    expect(checkIban('NL91ABNA0417164300').ok).toBe(true);
    expect(checkIban('GB82 WEST 1234 5698 7654 32').ok).toBe(true);
  });
  it('names the reason for invalid input', () => {
    expect(checkIban('')).toEqual({ ok: false, reason: 'empty' });
    expect(checkIban('1234')).toEqual({ ok: false, reason: 'format' });
    expect(checkIban('US12345678901234567890')).toEqual({ ok: false, reason: 'country' });
    expect(checkIban('DE8937040044053201300')).toEqual({ ok: false, reason: 'length' });
    expect(checkIban('DE89370400440532013001')).toEqual({ ok: false, reason: 'checksum' });
  });
  it('formats and masks', () => {
    expect(formatIban('de89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
    expect(maskIban('DE89370400440532013000')).toBe('DE89 •••• 3000');
  });
});

describe('amount', () => {
  it('parses German and English input to cents', () => {
    setCurrentLang('de');
    expect(checkAmount('12,50')).toEqual({ ok: true, cents: 1250 });
    expect(checkAmount('1.000')).toEqual({ ok: true, cents: 100000 });
    setCurrentLang('en');
    expect(checkAmount('12.50')).toEqual({ ok: true, cents: 1250 });
  });
  it('rejects zero, too many decimals and amounts over the limits', () => {
    setCurrentLang('de');
    expect(checkAmount('')).toEqual({ ok: false, reason: 'empty' });
    expect(checkAmount('abc')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkAmount('0')).toEqual({ ok: false, reason: 'zero' });
    expect(checkAmount('1,999')).toEqual({ ok: false, reason: 'decimals' });
    expect(checkAmount('1001')).toEqual({ ok: false, reason: 'perTransfer' });
    expect(checkAmount('600', LIMITS.perDayCents - 50000)).toEqual({ ok: false, reason: 'perDay' });
  });
});

describe('demo payee check', () => {
  it('grades names like Verification of Payee', () => {
    expect(demoPayeeCheck('Lena Hoffmann', 'DE02120300000000202051').result).toBe('match');
    expect(demoPayeeCheck('lena  hoffmann', 'DE02 1203 0000 0000 2020 51').result).toBe('match');
    expect(demoPayeeCheck('L. Hoffmann', 'DE02120300000000202051')).toEqual({ result: 'close_match', suggestedName: 'Lena Hoffmann' });
    expect(demoPayeeCheck('Max Mustermann', 'DE02120300000000202051').result).toBe('no_match');
    expect(demoPayeeCheck('Max Mustermann', 'NL91ABNA0417164300').result).toBe('unavailable');
  });
});

describe.each(LANGS)('transfer screens (%s)', (lang) => {
  const t = strings(lang);

  describe.each(SCHEMES)('%s theme', (scheme) => {
    it('overview shows the demo notice and saved recipients', async () => {
      await renderScreen(UeberweisenScreen, { lang, scheme });
      expect(screen.getByText(t.transfer.demoBanner)).toBeTruthy();
      expect(screen.getByText('Lena Hoffmann')).toBeTruthy();
      expect(screen.getByText(t.transfer.historyEmpty)).toBeTruthy();
      expect(cleanText()).toEqual([]);
    });

    it('new transfer starts with the recipient step', async () => {
      await renderScreen(NeueUeberweisungScreen, { lang, scheme });
      expect(screen.getByText(t.transfer.recipientTitle)).toBeTruthy();
      expect(cleanText()).toEqual([]);
    });
  });

  it('flags an IBAN with wrong check digits', async () => {
    await renderScreen(NeueUeberweisungScreen, { lang });
    fireEvent.changeText(screen.getByTestId('transfer-iban'), 'DE89370400440532013001');
    expect(screen.getByText(t.transfer.ibanErrors.checksum)).toBeTruthy();
  });

  it('sends a transfer to a saved recipient end to end', async () => {
    await renderScreen(NeueUeberweisungScreen, { lang });
    fireEvent.press(screen.getByText('Lena Hoffmann'));
    expect(screen.getByText(t.transfer.amountTitle)).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('transfer-amount'), lang === 'de' ? '25,50' : '25.50');
    fireEvent.changeText(screen.getByTestId('transfer-reference'), 'Pizza');
    fireEvent.press(screen.getByText(t.transfer.review));
    await settle();
    expect(screen.getByText(t.transfer.payee.match)).toBeTruthy();
    expect(screen.getByText(t.transfer.firstTransfer)).toBeTruthy();

    fireEvent.press(screen.getByText(t.transfer.send(formatEURCents(25.5))));
    await settle();
    expect(screen.getByText(t.transfer.doneInstant)).toBeTruthy();
    expect(cleanText()).toEqual([]);

    const [sent] = await getTransfers();
    expect(sent).toMatchObject({ name: 'Lena Hoffmann', amountCents: 2550, reference: 'Pizza', status: 'executed', demo: true });
    expect(await isKnownPayee('DE02 1203 0000 0000 2020 51')).toBe(true);
    expect(await sentTodayCents()).toBe(2550);
  });

  it('asks for confirmation before sending to a name that does not match', async () => {
    await renderScreen(NeueUeberweisungScreen, { lang });
    fireEvent.changeText(screen.getByTestId('transfer-name'), 'Max Mustermann');
    fireEvent.changeText(screen.getByTestId('transfer-iban'), 'DE02120300000000202051');
    fireEvent.press(screen.getByText(t.transfer.continue));
    await settle();
    fireEvent.changeText(screen.getByTestId('transfer-amount'), '10');
    fireEvent.press(screen.getByText(t.transfer.review));
    await settle();
    expect(screen.getByText(t.transfer.payee.no_match)).toBeTruthy();
    expect(screen.getByText(t.transfer.confirmRisk)).toBeTruthy();
    expect(await getTransfers()).toEqual([]);
  });
});
