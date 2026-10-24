// Saved recipients and transfer history, kept on the phone (AsyncStorage) while the app runs
// on the demo provider. With the real provider, the history moves to Supabase and is written by
// the server that talks to the provider; saved recipients can move to Supabase as well.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Recipient, Transfer } from './types';
import { normalizeIban } from '../iban';

const RECIPIENTS_KEY = 'mt.transfers.recipients.v1';
const HISTORY_KEY = 'mt.transfers.history.v1';

/** Example recipients for the demo, matching the demo provider's directory. */
const DEMO_RECIPIENTS: Omit<Recipient, 'createdAt'>[] = [
  { id: 'demo-lena', name: 'Lena Hoffmann', iban: 'DE02120300000000202051' },
  { id: 'demo-jonas', name: 'Jonas Weber', iban: 'DE12500105170648489890' },
  { id: 'demo-miriam', name: 'Miriam Schulz', iban: 'DE75512108001245126199' },
];

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const writeJson = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));

export async function getRecipients(): Promise<Recipient[]> {
  const stored = await readJson<Recipient[] | null>(RECIPIENTS_KEY, null);
  if (stored) return stored;
  const seeded = DEMO_RECIPIENTS.map((r) => ({ ...r, createdAt: new Date(0).toISOString() }));
  await writeJson(RECIPIENTS_KEY, seeded);
  return seeded;
}

/** Saves a recipient unless the IBAN is already saved; returns the saved entry. */
export async function saveRecipient(name: string, iban: string): Promise<Recipient> {
  const list = await getRecipients();
  const normalized = normalizeIban(iban);
  const existing = list.find((r) => r.iban === normalized);
  if (existing) return existing;
  const recipient: Recipient = { id: newId(), name: name.trim(), iban: normalized, createdAt: new Date().toISOString() };
  await writeJson(RECIPIENTS_KEY, [recipient, ...list]);
  return recipient;
}

export async function removeRecipient(id: string) {
  const list = await getRecipients();
  await writeJson(RECIPIENTS_KEY, list.filter((r) => r.id !== id));
}

/** Newest first. */
export const getTransfers = () => readJson<Transfer[]>(HISTORY_KEY, []);

export async function addTransfer(t: Transfer) {
  const list = await getTransfers();
  await writeJson(HISTORY_KEY, [t, ...list].slice(0, 200));
}

/** Has the user sent money to this IBAN before? First transfers get an extra warning. */
export async function isKnownPayee(iban: string) {
  const normalized = normalizeIban(iban);
  return (await getTransfers()).some((t) => t.iban === normalized && t.status !== 'failed');
}

/** Sum of today's (local date) non-failed transfers, for the daily limit. */
export async function sentTodayCents(now = new Date()) {
  const day = now.toDateString();
  return (await getTransfers())
    .filter((t) => t.status !== 'failed' && new Date(t.createdAt).toDateString() === day)
    .reduce((sum, t) => sum + t.amountCents, 0);
}
