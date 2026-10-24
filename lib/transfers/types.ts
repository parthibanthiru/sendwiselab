// Shared types for Money Transfer.
//
// The app never moves money itself. A licensed open-banking provider (finAPI, Tink or Yapily,
// see the launch roadmap) initiates a SEPA transfer from the user's own bank account; the bank
// executes it after the user approves it there. Everything provider-specific sits behind
// `TransferProvider`, so the demo provider can be swapped for the real one without changing screens.

export type Speed = 'instant' | 'standard';

/**
 * Verification of Payee (EU Instant Payments Regulation): the payer's bank compares the
 * name typed by the payer with the account holder of the IBAN before the transfer.
 * - match: name fits
 * - close_match: almost fits; the bank returns the real name (suggestedName)
 * - no_match: name does not fit — likely a typo or a scam
 * - unavailable: the check could not be done (e.g. receiving bank not reachable)
 */
export type PayeeCheck = {
  result: 'match' | 'close_match' | 'no_match' | 'unavailable';
  suggestedName?: string;
};

export type Recipient = {
  id: string;
  name: string;
  iban: string; // normalised, no spaces
  createdAt: string;
};

export type TransferDraft = {
  name: string;
  iban: string; // normalised, no spaces
  amountCents: number;
  reference: string;
  speed: Speed;
};

export type TransferStatus =
  | 'executed' // instant transfer done
  | 'pending' // standard transfer accepted, arrives next business day
  | 'failed';

export type Transfer = TransferDraft & {
  id: string;
  status: TransferStatus;
  createdAt: string;
  payeeCheck: PayeeCheck['result'];
  demo: boolean;
};

export type SourceAccount = { label: string; iban: string };

export interface TransferProvider {
  /** 'demo' until a provider contract is signed. */
  readonly id: string;
  readonly isDemo: boolean;
  /** The user's connected bank account, or null if none is connected yet. */
  sourceAccount(): Promise<SourceAccount | null>;
  verifyPayee(name: string, iban: string): Promise<PayeeCheck>;
  /**
   * Starts the transfer. A real provider returns `authorizeUrl` (its web form where the user
   * approves the transfer with their bank); the screen then opens it and waits for the result.
   */
  initiate(draft: TransferDraft, payeeCheck: PayeeCheck['result']): Promise<{ transfer: Transfer; authorizeUrl?: string }>;
}
