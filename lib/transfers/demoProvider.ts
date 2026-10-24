// Demo provider: simulates the open-banking provider so the transfer flow can be built and
// tested before a provider contract exists. No network calls, no real money.
// Replace with the real provider (lib/transfers/index.ts → getTransferProvider) once the
// contract is signed; the screens only talk to the TransferProvider interface.
import type { PayeeCheck, SourceAccount, Transfer, TransferDraft, TransferProvider } from './types';
import { normalizeIban } from '../iban';
import { addTransfer, newId } from './store';

/** Fictitious account holders behind the demo IBANs, used for the simulated payee check. */
export const DEMO_DIRECTORY: Record<string, string> = {
  DE02120300000000202051: 'Lena Hoffmann',
  DE12500105170648489890: 'Jonas Weber',
  DE75512108001245126199: 'Miriam Schulz',
};

const DEMO_ACCOUNT: SourceAccount = { label: 'Demo-Girokonto', iban: 'DE89370400440532013000' };

const delay = (ms: number) => new Promise((r) => setTimeout(r, process.env.NODE_ENV === 'test' ? 0 : ms));

/** "Müller,  Jörg" -> "muller jorg" */
export function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/** Simulated Verification of Payee, roughly like banks grade it. */
export function demoPayeeCheck(name: string, iban: string): PayeeCheck {
  const holder = DEMO_DIRECTORY[normalizeIban(iban)];
  if (!holder) return { result: 'unavailable' };
  const typed = normalizeName(name);
  const real = normalizeName(holder);
  if (typed === real) return { result: 'match' };
  const lastName = real.split(' ').at(-1) ?? '';
  const close = distance(typed, real) <= 2 || (lastName.length > 2 && typed.split(' ').includes(lastName));
  return close ? { result: 'close_match', suggestedName: holder } : { result: 'no_match' };
}

export const demoProvider: TransferProvider = {
  id: 'demo',
  isDemo: true,
  async sourceAccount() {
    return DEMO_ACCOUNT;
  },
  async verifyPayee(name, iban) {
    await delay(400);
    return demoPayeeCheck(name, iban);
  },
  async initiate(draft: TransferDraft, payeeCheck) {
    await delay(900);
    const transfer: Transfer = {
      ...draft,
      id: newId(),
      status: draft.speed === 'instant' ? 'executed' : 'pending',
      createdAt: new Date().toISOString(),
      payeeCheck,
      demo: true,
    };
    await addTransfer(transfer);
    return { transfer };
  },
};
