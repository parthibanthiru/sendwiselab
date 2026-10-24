// Types for international transfers (sending euros abroad, paid out in the local currency).
//
// The app never converts or pays out money itself. A licensed cross-border payment partner
// (to be chosen; it handles conversion, payout, identity checks and sanctions screening)
// does that behind `PayoutProvider`. Until a contract exists, the demo provider simulates it:
// its rates, fees and delivery times are sample values and are labelled as such on screen.

/** How the money reaches the recipient's account; decides which bank details are asked for. */
export type PayoutMethod =
  | 'in_bank' // India: account number + IFSC
  | 'gb_bank' // United Kingdom: sort code + account number
  | 'us_bank' // United States: ABA routing number + account number + account type
  | 'iban' // countries with IBAN payouts in their own currency (e.g. CH, PL, SE, TR, AE)
  | 'swift'; // everywhere else: SWIFT/BIC + account number

export type Country = {
  code: string; // ISO 3166-1 alpha-2
  currency: string; // ISO 4217
  decimals: number; // minor units of the currency
  method: PayoutMethod;
};

export type RecipientField = 'accountNumber' | 'ifsc' | 'sortCode' | 'routingNumber' | 'accountType' | 'iban' | 'bic' | 'address';

export type AccountType = 'checking' | 'savings';

export type IntlRecipient = {
  id: string;
  name: string;
  country: string;
  fields: Partial<Record<RecipientField, string>>; // normalised values
  createdAt: string;
};

export type Delivery = 'minutes' | 'oneDay' | 'oneToTwoDays' | 'twoToFourDays';

export type Purpose = 'family' | 'gift' | 'bills' | 'savings' | 'services' | 'other';

export type Quote = {
  country: string;
  currency: string;
  decimals: number;
  sendCents: number; // what the user pays, in euro cents (fee included)
  feeCents: number;
  rate: number; // 1 EUR = rate × currency
  receiveMinor: number; // what the recipient gets, in minor units of `currency`
  delivery: Delivery;
  demo: boolean; // true: sample values, not a real offer
};

export type IntlTransferStatus = 'processing' | 'paid_out' | 'failed';

export type IntlTransfer = Quote & {
  kind: 'international';
  id: string;
  name: string;
  account: string; // masked, for display
  purpose: Purpose;
  reference: string;
  status: IntlTransferStatus;
  createdAt: string;
};

export type IdentityStatus = 'none' | 'verified';

export type Identity = {
  status: IdentityStatus;
  fullName?: string;
  birthDate?: string; // YYYY-MM-DD
  street?: string;
  city?: string;
  verifiedAt?: string;
  demo?: boolean;
};

export interface PayoutProvider {
  readonly id: string;
  readonly isDemo: boolean;
  /** Price for sending `sendCents` (fee included) to `country`; null if the country isn't served. */
  quote(country: string, sendCents: number): Promise<Quote | null>;
  /** Starts the payout after the user approved the quote. */
  create(
    quote: Quote,
    details: { recipient: IntlRecipient; purpose: Purpose; reference: string }
  ): Promise<IntlTransfer>;
}
