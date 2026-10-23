/** Shared helpers for Server Action forms. */

export interface FormState {
  error?: string;
  fields?: Record<string, string>;
  notice?: string;
  /** Echo of what the user typed, so a failed submit does not wipe the form. */
  values?: Record<string, string>;
  needsConsent?: boolean;
  /** The API's error code, for redirects that carry it in the URL. */
  code?: string;
}

export const TERMS_VERSION = '2026-10';
export const PRIVACY_VERSION = '2026-10';

export const str = (fd: FormData, key: string): string => String(fd.get(key) ?? '').trim();

/** Nigerian numbers typed locally (0803…) become E.164 (+234803…). */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/[\s()-]/g, '');
  if (/^0\d{10}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^234\d{10}$/.test(digits)) return `+${digits}`;
  return digits;
}

/** An email stays as typed (lower-cased); anything else is treated as a phone number. */
export function normaliseIdentifier(raw: string): string {
  const value = raw.trim();
  return value.includes('@') ? value.toLowerCase() : normalisePhone(value);
}

/**
 * Only same-site relative paths, never //evil.com or absolute URLs. Browsers drop tabs and newlines
 * from URLs and read a backslash as a slash, so "/\t/evil.com" would become //evil.com: any control
 * character or backslash is refused, and the result must still resolve to this origin.
 */
export function safeNext(next: string | null | undefined, fallback = '/app'): string {
  if (!next || !next.startsWith('/') || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  try {
    const url = new URL(next, 'https://same.invalid');
    if (url.origin !== 'https://same.invalid') return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
