// IBAN helpers for the transfer feature: normalising, display formatting, masking and the
// ISO 13616 check-digit test (mod 97). Only SEPA countries are accepted, because the app
// sends SEPA credit transfers only.

/** IBAN length per SEPA country (ISO 13616 registry). */
export const SEPA_IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24,
  FI: 18, FR: 27, GB: 22, GI: 23, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21,
  LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24,
  SI: 19, SK: 24, SM: 27, VA: 22,
};

/** "de89 3704 0044…" -> "DE89370400440532013000" */
export const normalizeIban = (raw: string) => raw.replace(/[\s-]+/g, '').toUpperCase();

/** Groups of four, the way banks print IBANs: "DE89 3704 0044 0532 0130 00". */
export const formatIban = (raw: string) => normalizeIban(raw).replace(/(.{4})(?=.)/g, '$1 ');

/** Short form for lists: "DE89 •••• 3000". */
export function maskIban(raw: string) {
  const s = normalizeIban(raw);
  return s.length < 8 ? s : `${s.slice(0, 4)} •••• ${s.slice(-4)}`;
}

export type IbanCheck =
  | { ok: true; iban: string; country: string }
  | { ok: false; reason: 'empty' | 'format' | 'country' | 'length' | 'checksum' };

function mod97(s: string) {
  let rest = 0;
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    const digits = code >= 65 && code <= 90 ? String(code - 55) : ch;
    for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest;
}

export function checkIban(raw: string): IbanCheck {
  const iban = normalizeIban(raw);
  if (!iban) return { ok: false, reason: 'empty' };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return { ok: false, reason: 'format' };
  const country = iban.slice(0, 2);
  const length = SEPA_IBAN_LENGTHS[country];
  if (!length) return { ok: false, reason: 'country' };
  if (iban.length !== length) return { ok: false, reason: 'length' };
  if (mod97(iban.slice(4) + iban.slice(0, 4)) !== 1) return { ok: false, reason: 'checksum' };
  return { ok: true, iban, country };
}

export const isValidIban = (raw: string) => checkIban(raw).ok;
