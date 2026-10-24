// Entry point of the transfer logic: which provider runs and the app's own safety limits.
import { parseNumber } from '../format';
import { demoProvider } from './demoProvider';
import type { TransferProvider } from './types';

export * from './types';
export * from './store';

/** Only the demo provider exists so far; the real one is added here after the contract. */
export function getTransferProvider(): TransferProvider {
  return demoProvider;
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
