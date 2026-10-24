// Number formatting in the current language, (de-DE / en-IE locales)
// (de-DE: "1.234,50 €" / "9,66 %"; en-IE: "€1,234.50" / "9.66%").
import { getLang, locale } from './i18n';

export const formatEUR = (n: number) =>
  n.toLocaleString(locale(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const formatEURCents = (n: number) =>
  n.toLocaleString(locale(), { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 9.66 -> "9,66 %" (German) / "9.66%" (English) */
export function formatPct(n: number, digits = 2) {
  return getLang() === 'en' ? `${n.toFixed(digits)}%` : `${n.toFixed(digits).replace('.', ',')} %`;
}

/** Plain number with thousands separators, e.g. 2827 -> "2.827" / "2,827". */
export const formatNumber = (n: number, decimals = 0) =>
  n.toLocaleString(locale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Dates like the profile's "member since": 24.10.2026 / 24/10/2026. */
export const formatDate = (d: Date | string | number) =>
  new Date(d).toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'de-DE');

/**
 * Parses a typed number in the current language: German "1.000,50", English "1,000.50".
 * The other language's decimal mark is understood too when it can only mean a decimal
 * (one separator followed by 1–2 digits, e.g. "2,9" in English or "2.9" in German), since
 * phone keypads don't always show the expected key. Returns NaN for empty/invalid input.
 */
export function parseNumber(input: string): number {
  let s = input.replace(/\s|€|%/g, '');
  if (getLang() === 'en') {
    s = /^\d*,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  } else {
    s = /^\d*\.\d{1,2}$/.test(s) ? s : s.replace(/\./g, '').replace(',', '.');
  }
  return s === '' ? NaN : Number(s);
}
