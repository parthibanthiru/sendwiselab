// Entry point of the transfer logic: which provider runs and the app's own safety limits.
import { parseNumber } from '../format';
import { demoProvider } from './demoProvider';
import { demoPayoutProvider } from './international/demoPayout';
import type { TransferProvider } from './types';
import type { PayoutProvider } from './international/types';

export * from './types';
export * from './store';
export * from './international/types';
export * from './international/store';
export * from './international/countries';
export * from './international/validate';

/** Only the demo provider exists so far; the real one is added here after the contract. */
export function getTransferProvider(): TransferProvider {
  return demoProvider;
}

/** International transfers: demo partner until a licensed payout partner is contracted. */
export function getPayoutProvider(): PayoutProvider {
  return demoPayoutProvider;
}

/**
 * Identity check before the first international transfer: adult (18+) by `birthDate`
 * (YYYY-MM-DD). The real partner does the actual verification (ID document or eID).
 */
export function isAdult(birthDate: string, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return false;
  const adultFrom = new Date(y + 18, mo - 1, d);
  return adultFrom <= now && y > 1900;
}

/** "24.10.1990" (German) or "24/10/1990" (English) -> "1990-10-24"; '' when it can't be read. */
export function parseBirthDate(input: string) {
  const m = /^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*$/.exec(input);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/**
 * The app's own limits against scams and typos, on top of the bank's limits.
 * Starting values for the beta, to be reviewed with the provider.
 */
export const LIMITS = {
  perTransferCents: 1_000_00,
  perDayCents: 2_000_00,
  referenceMaxLength: 140, // SEPA remittance information
  nameMaxLength: 70, // SEPA creditor name
};

export type AmountCheck =
  | { ok: true; cents: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'zero' | 'decimals' | 'perTransfer' | 'perDay' };

/** Validates a typed amount ("12,50" in German, "12.50" in English) against the limits. */
export function checkAmount(input: string, sentToday = 0): AmountCheck {
  if (!input.trim()) return { ok: false, reason: 'empty' };
  const n = parseNumber(input);
  if (!Number.isFinite(n) || n < 0) return { ok: false, reason: 'invalid' };
  const cents = Math.round(n * 100);
  if (Math.abs(n * 100 - cents) > 1e-6) return { ok: false, reason: 'decimals' };
  if (cents === 0) return { ok: false, reason: 'zero' };
  if (cents > LIMITS.perTransferCents) return { ok: false, reason: 'perTransfer' };
  if (sentToday + cents > LIMITS.perDayCents) return { ok: false, reason: 'perDay' };
  return { ok: true, cents };
}
