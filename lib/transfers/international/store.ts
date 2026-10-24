// International recipients, transfers and the identity check status, kept on the device
// (AsyncStorage; the browser's local storage on the web) while the app runs on the demo partner.
// With the real partner, transfers and the identity status come from the server instead.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Identity, IntlRecipient, IntlTransfer } from './types';

const RECIPIENTS_KEY = 'mt.transfers.intl.recipients.v1';
const HISTORY_KEY = 'mt.transfers.intl.history.v1';
const IDENTITY_KEY = 'mt.transfers.identity.v1';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const writeJson = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));

/** Example recipients for the demo (fictitious people, valid-looking bank details). */
const DEMO_RECIPIENTS: IntlRecipient[] = [
  {
    id: 'demo-priya',
    name: 'Priya Raman',
    country: 'IN',
    fields: { accountNumber: '50100234567821', ifsc: 'HDFC0001234' },
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'demo-oliver',
    name: 'Oliver Grant',
    country: 'GB',
    fields: { sortCode: '200000', accountNumber: '55779911' },
    createdAt: new Date(0).toISOString(),
  },
];

export async function getIntlRecipients(): Promise<IntlRecipient[]> {
  const stored = await readJson<IntlRecipient[] | null>(RECIPIENTS_KEY, null);
  if (stored) return stored;
  await writeJson(RECIPIENTS_KEY, DEMO_RECIPIENTS);
  return DEMO_RECIPIENTS;
}

const sameAccount = (a: IntlRecipient, b: IntlRecipient) =>
  a.country === b.country && JSON.stringify(a.fields) === JSON.stringify(b.fields);

/** Saves a recipient unless the same account is already saved; returns the saved entry. */
export async function saveIntlRecipient(recipient: IntlRecipient): Promise<IntlRecipient> {
  const list = await getIntlRecipients();
  const existing = list.find((r) => sameAccount(r, recipient));
  if (existing) return existing;
  await writeJson(RECIPIENTS_KEY, [recipient, ...list]);
  return recipient;
}

/** Newest first. */
export const getIntlTransfers = () => readJson<IntlTransfer[]>(HISTORY_KEY, []);

export async function addIntlTransfer(t: IntlTransfer) {
  const list = await getIntlTransfers();
  await writeJson(HISTORY_KEY, [t, ...list].slice(0, 200));
}

/** Has the user sent money to this account before? First transfers get an extra warning. */
export async function isKnownIntlAccount(country: string, account: string) {
  return (await getIntlTransfers()).some((t) => t.country === country && t.account === account && t.status !== 'failed');
}

export const getIdentity = () => readJson<Identity>(IDENTITY_KEY, { status: 'none' });

export const saveIdentity = (identity: Identity) => writeJson(IDENTITY_KEY, identity);
