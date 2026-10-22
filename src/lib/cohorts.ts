/**
 * Shared wording and helpers for cohorts (LRN-2): intakes, the dated calendar, classes and attendance.
 * Type-only imports from the contracts, so client components can use this without pulling in zod.
 */
import type { AttendanceEntrySchema, ClassSession, Cohort, CohortDetail, MyProgram, RosterEntrySchema } from '@dreamlab/contracts';
import type { z } from 'zod';

export type { ClassSession, Cohort, CohortDetail, MyProgram };
export type RosterEntry = z.infer<typeof RosterEntrySchema>;
export type AttendanceEntry = z.infer<typeof AttendanceEntrySchema>;
export type AttendanceSheet = { session: ClassSession; items: AttendanceEntry[] };
export type AttendanceStatus = NonNullable<AttendanceEntry['status']>;

export const COHORT_STATUS_LABELS: Record<Cohort['status'], string> = {
  draft: 'Draft',
  open: 'Open to join',
  running: 'Running',
  closed: 'Closed',
};

export const COHORT_STATUS_TONES: Record<Cohort['status'], 'neutral' | 'green' | 'gold' | 'danger'> = {
  draft: 'neutral',
  open: 'green',
  running: 'gold',
  closed: 'neutral',
};

export const POLICY_LABELS: Record<Cohort['enrollmentPolicy'], string> = {
  open: 'Anyone signed in can join',
  invite: 'Members of the host organisation only',
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
};

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const TIME_ZONES = ['Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg', 'Africa/Cairo', 'Africa/Casablanca', 'Europe/London', 'UTC'] as const;

/** "Cohort 01 · starts 2 Nov 2026". */
export const calendarDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** A class time as the cohort keeps it: "Tue 3 Nov, 21:00" in the cohort's time zone. */
export function classTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone });
}

/** The wall-clock date and time of an instant in a time zone, for datetime-local inputs ("2026-11-03T21:00"). */
export function localInput(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** The instant of a wall-clock time in a time zone (handles daylight saving). */
export function fromLocalInput(value: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const wall = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
  const offset = (at: number) => Date.parse(`${localInput(new Date(at).toISOString(), timeZone)}:00Z`) - at;
  let utc = wall - offset(wall);
  utc = wall - offset(utc);
  return new Date(utc).toISOString();
}

export const isPast = (session: ClassSession, now = Date.now()) => Date.parse(session.startsAt) < now;
