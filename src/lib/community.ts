/**
 * Shared wording and helpers for live classes (LIVE-1) and the cohort community (COMM-1): mentors,
 * mentor meetings and Dream Circles. Type-only imports from the contracts, so client components can
 * use this without pulling in zod.
 */
import type {
  DreamCircle,
  JoinTicket,
  MAX_RECORDING_BYTES as CONTRACT_MAX_RECORDING,
  MentorAssignment,
  MentoringSchema,
  MentorMeeting,
  MyCommunity,
  Recording,
  RECORDING_TYPES as CONTRACT_RECORDING_TYPES,
  RecordingUpload,
  SessionLive,
} from '@dreamlab/contracts';
import type { z } from 'zod';

export type { DreamCircle, JoinTicket, MentorAssignment, MentorMeeting, MyCommunity, Recording, RecordingUpload, SessionLive };
export type Mentoring = z.infer<typeof MentoringSchema>;
export type Person = { userId: string; name: string };

/** Same list as the contracts' RECORDING_TYPES; `satisfies` fails the typecheck if they drift. */
export const RECORDING_TYPES = ['video/mp4', 'video/webm', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/mp4'] as const satisfies typeof CONTRACT_RECORDING_TYPES;
export const MAX_RECORDING_BYTES: typeof CONTRACT_MAX_RECORDING = 2 * 1024 * 1024 * 1024;

export const MEETING_STATUS_LABELS: Record<MentorMeeting['status'], string> = {
  scheduled: 'Scheduled',
  held: 'Held',
  cancelled: 'Cancelled',
};

export const MEETING_STATUS_TONES: Record<MentorMeeting['status'], 'neutral' | 'green' | 'gold' | 'danger'> = {
  scheduled: 'gold',
  held: 'green',
  cancelled: 'neutral',
};

/** Rooms open this long before a class and close this long after it should have ended (the API decides). */
const OPENS_BEFORE_MS = 15 * 60_000;
const CLOSES_AFTER_MS = 60 * 60_000;

/** Whether a virtual class is in its join window now: for showing the button; the API has the last word. */
export function inJoinWindow(s: { startsAt: string; durationMin: number; mode: string; cancelled: boolean }, now = Date.now()): boolean {
  const start = Date.parse(s.startsAt);
  return s.mode === 'virtual' && !s.cancelled && now >= start - OPENS_BEFORE_MS && now <= start + s.durationMin * 60_000 + CLOSES_AFTER_MS;
}

/** "Join class" links go to these pages, which fetch a fresh join token. */
export const sessionRoomHref = (cohortId: string, sessionId: string) => `/app/live/session/${cohortId}/${sessionId}`;
export const meetingRoomHref = (meetingId: string) => `/app/live/meeting/${meetingId}`;
