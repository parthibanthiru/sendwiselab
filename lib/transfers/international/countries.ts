// Destinations for international transfers: currency and how the payout reaches the account.
// Euro countries are not listed here; they use the SEPA transfer. The final list depends on the
// payout partner's coverage and its sanctions rules.
import type { Country, PayoutMethod, RecipientField } from './types';

export const COUNTRIES: Country[] = [
  // main corridors
  { code: 'IN', currency: 'INR', decimals: 2, method: 'in_bank' },
  { code: 'GB', currency: 'GBP', decimals: 2, method: 'gb_bank' },
  { code: 'US', currency: 'USD', decimals: 2, method: 'us_bank' },
  // Europe outside the euro
  { code: 'CH', currency: 'CHF', decimals: 2, method: 'iban' },
  { code: 'PL', currency: 'PLN', decimals: 2, method: 'iban' },
  { code: 'CZ', currency: 'CZK', decimals: 2, method: 'iban' },
  { code: 'HU', currency: 'HUF', decimals: 2, method: 'iban' },
  { code: 'RO', currency: 'RON', decimals: 2, method: 'iban' },
  { code: 'SE', currency: 'SEK', decimals: 2, method: 'iban' },
  { code: 'DK', currency: 'DKK', decimals: 2, method: 'iban' },
  { code: 'NO', currency: 'NOK', decimals: 2, method: 'iban' },
  { code: 'TR', currency: 'TRY', decimals: 2, method: 'iban' },
  // rest of the world
  { code: 'AE', currency: 'AED', decimals: 2, method: 'iban' },
  { code: 'PK', currency: 'PKR', decimals: 2, method: 'iban' },
  { code: 'AU', currency: 'AUD', decimals: 2, method: 'swift' },
  { code: 'BD', currency: 'BDT', decimals: 2, method: 'swift' },
  { code: 'BR', currency: 'BRL', decimals: 2, method: 'iban' },
  { code: 'CA', currency: 'CAD', decimals: 2, method: 'swift' },
  { code: 'JP', currency: 'JPY', decimals: 0, method: 'swift' },
  { code: 'KE', currency: 'KES', decimals: 2, method: 'swift' },
  { code: 'LK', currency: 'LKR', decimals: 2, method: 'swift' },
  { code: 'MX', currency: 'MXN', decimals: 2, method: 'swift' },
  { code: 'NG', currency: 'NGN', decimals: 2, method: 'swift' },
  { code: 'NP', currency: 'NPR', decimals: 2, method: 'swift' },
  { code: 'NZ', currency: 'NZD', decimals: 2, method: 'swift' },
  { code: 'PH', currency: 'PHP', decimals: 2, method: 'swift' },
  { code: 'SG', currency: 'SGD', decimals: 2, method: 'swift' },
  { code: 'ZA', currency: 'ZAR', decimals: 2, method: 'swift' },
];

export const MAIN_COUNTRIES = ['IN', 'GB', 'US'];

export const getCountry = (code: string): Country | undefined => COUNTRIES.find((c) => c.code === code);

/** Bank details asked for each payout method, in display order. */
export const FIELDS: Record<PayoutMethod, RecipientField[]> = {
  in_bank: ['accountNumber', 'ifsc'],
  gb_bank: ['sortCode', 'accountNumber'],
  us_bank: ['routingNumber', 'accountNumber', 'accountType', 'address'],
  iban: ['iban'],
  swift: ['bic', 'accountNumber', 'address'],
};
