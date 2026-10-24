// Demo payout provider: simulates a licensed cross-border payment partner so the international
// flow can be built and tested before a contract exists. No network calls, no real money.
// Rates, fee and delivery times below are SAMPLE VALUES for the demo; the screens label them as
// such. The real partner returns its own quote (lib/transfers/index.ts → getPayoutProvider).
import { newId } from '../store';
import { addIntlTransfer } from './store';
import { getCountry } from './countries';
import { maskAccount } from './validate';
import type { Delivery, IntlTransfer, PayoutMethod, PayoutProvider, Quote } from './types';

/** Sample rates, 1 EUR = x (fixed for the demo; not market data). */
export const DEMO_RATES: Record<string, number> = {
  INR: 92.36, GBP: 0.8471, USD: 1.0842, CHF: 0.9418, PLN: 4.3012, CZK: 25.28, HUF: 395.4, RON: 4.977,
  SEK: 11.42, DKK: 7.4605, NOK: 11.78, TRY: 37.21, AED: 3.9817, PKR: 301.5, AUD: 1.6487, BDT: 129.6,
  BRL: 6.052, CAD: 1.4934, JPY: 165.21, KES: 140.1, LKR: 322.0, MXN: 20.91, NGN: 1730.0, NPR: 147.8,
  NZD: 1.8103, PHP: 62.4, SGD: 1.4402, ZAR: 19.62,
};

/** Sample fee: 0.99 € plus 0.5 % of the amount, rounded to the cent. */
export const demoFeeCents = (sendCents: number) => 99 + Math.round(sendCents * 0.005);

const DEMO_DELIVERY: Record<PayoutMethod, Delivery> = {
  in_bank: 'minutes',
  gb_bank: 'minutes',
  us_bank: 'oneToTwoDays',
  iban: 'oneDay',
  swift: 'twoToFourDays',
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, process.env.NODE_ENV === 'test' ? 0 : ms));

export function demoQuote(country: string, sendCents: number): Quote | null {
  const c = getCountry(country);
  const rate = c && DEMO_RATES[c.currency];
  if (!c || !rate || sendCents <= 0) return null;
  const feeCents = Math.min(demoFeeCents(sendCents), sendCents);
  const converted = ((sendCents - feeCents) / 100) * rate;
  return {
    country: c.code,
    currency: c.currency,
    decimals: c.decimals,
    sendCents,
    feeCents,
    rate,
    receiveMinor: Math.floor(converted * 10 ** c.decimals),
    delivery: DEMO_DELIVERY[c.method],
    demo: true,
  };
}

export const demoPayoutProvider: PayoutProvider = {
  id: 'demo',
  isDemo: true,
  async quote(country, sendCents) {
    await delay(250);
    return demoQuote(country, sendCents);
  },
  async create(quote, { recipient, purpose, reference }) {
    await delay(900);
    const transfer: IntlTransfer = {
      ...quote,
      kind: 'international',
      id: newId(),
      name: recipient.name,
      account: maskAccount(recipient.country, recipient.fields),
      purpose,
      reference,
      status: 'processing',
      createdAt: new Date().toISOString(),
    };
    await addIntlTransfer(transfer);
    return transfer;
  },
};
