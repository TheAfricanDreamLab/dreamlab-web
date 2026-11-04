import { str } from '@/lib/forms';

/**
 * The browser's time zone, sent with the form, so a typed time means what the person meant. Missing
 * (the form was sent before the page finished loading) or unknown: null, and the time is refused
 * rather than guessed.
 */
export function zoneOf(fd: FormData): string | null {
  const tz = str(fd, 'timeZone');
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

export const NO_ZONE = 'Your browser’s time zone isn’t known yet. Wait for the page to finish loading, then try again.';

/** A datetime-local value, e.g. 2026-11-10T17:00. */
export const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
