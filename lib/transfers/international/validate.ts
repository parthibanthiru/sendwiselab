// Checks for international bank details, so typos are caught before a payout is requested.
// Each check returns a reason the screen turns into a message, or null when the value is fine.
import { checkAnyIban, normalizeIban } from '../../iban';
import { FIELDS, getCountry } from './countries';
import type { RecipientField } from './types';

export type FieldError = 'required' | 'format' | 'checksum' | 'country' | 'length';

const digits = (s: string) => s.replace(/[\s-]+/g, '');

/** Values as they are stored: spaces and dashes removed, letters upper-cased where it matters. */
export function normalizeField(field: RecipientField, value: string): string {
  switch (field) {
    case 'address':
    case 'accountType':
      return value.trim();
    case 'iban':
      return normalizeIban(value);
    default:
      return digits(value).toUpperCase();
  }
}

/** Indian Financial System Code: 4 letters (bank), a zero, 6 letters or digits (branch). */
export const isIfsc = (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);

/** ABA routing number: 9 digits with the 3-7-1 weighted check digit. */
export function isAbaRouting(v: string) {
  if (!/^\d{9}$/.test(v)) return false;
  const d = [...v].map(Number);
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

/** SWIFT/BIC: 4 letters bank, 2 letters country, 2 location, optional 3 branch. */
export const isBic = (v: string) => /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);

export function checkField(country: string, field: RecipientField, raw: string): FieldError | null {
  const v = normalizeField(field, raw);
  if (!v) return 'required';
  switch (field) {
    case 'ifsc':
      return isIfsc(v) ? null : 'format';
    case 'sortCode':
      return /^\d{6}$/.test(v) ? null : 'format';
    case 'routingNumber':
      if (!/^\d{9}$/.test(v)) return 'format';
      return isAbaRouting(v) ? null : 'checksum';
    case 'accountType':
      return v === 'checking' || v === 'savings' ? null : 'required';
    case 'address':
      return v.length >= 5 ? null : 'format';
    case 'iban': {
      const r = checkAnyIban(v, country);
      if (r.ok) return null;
      return r.reason === 'empty' ? 'required' : r.reason;
    }
    case 'bic':
      if (!isBic(v)) return 'format';
      return v.slice(4, 6) === country ? null : 'country';
    case 'accountNumber': {
      const method = getCountry(country)?.method;
      if (method === 'in_bank') return /^\d{9,18}$/.test(v) ? null : 'format';
      if (method === 'gb_bank') return /^\d{8}$/.test(v) ? null : 'format';
      if (method === 'us_bank') return /^\d{4,17}$/.test(v) ? null : 'format';
      return /^[A-Z0-9]{4,34}$/.test(v) ? null : 'format';
    }
  }
}

/** All fields of a recipient for a country, with their check result. */
export function checkRecipient(country: string, name: string, fields: Partial<Record<RecipientField, string>>) {
  const c = getCountry(country);
  const errors: Partial<Record<RecipientField, FieldError>> = {};
  if (!c) return { ok: false, errors, nameOk: false };
  for (const f of FIELDS[c.method]) {
    const e = checkField(country, f, fields[f] ?? '');
    if (e) errors[f] = e;
  }
  const nameOk = name.trim().split(/\s+/).filter(Boolean).length >= 2;
  return { ok: nameOk && Object.keys(errors).length === 0, errors, nameOk };
}

/** Short account label for lists: "IFSC HDFC0001234 · ••4821". */
export function maskAccount(country: string, fields: Partial<Record<RecipientField, string>>) {
  const c = getCountry(country);
  const tail = (s?: string) => (s ? `••${s.slice(-4)}` : '');
  switch (c?.method) {
    case 'in_bank':
      return `${fields.ifsc ?? ''} · ${tail(fields.accountNumber)}`;
    case 'gb_bank':
      return `${(fields.sortCode ?? '').replace(/(\d{2})(?=\d)/g, '$1-')} · ${tail(fields.accountNumber)}`;
    case 'us_bank':
      return `${fields.routingNumber ?? ''} · ${tail(fields.accountNumber)}`;
    case 'iban':
      return `${(fields.iban ?? '').slice(0, 4)} •••• ${(fields.iban ?? '').slice(-4)}`;
    default:
      return `${fields.bic ?? ''} · ${tail(fields.accountNumber)}`;
  }
}
