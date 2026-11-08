/**
 * Staying on track (LRN-9): wording and small helpers for goals, pace, catch-up lists and circle
 * progress. Type-only imports from the contracts, so client components can use this without zod.
 */
import type { CatchUpItem, CircleProgress, GoalScope, LearningGoal, OnTrack, Pace, ProgramOnTrack, StudyDay } from '@dreamlab/contracts';

export type { CatchUpItem, CircleProgress, GoalScope, LearningGoal, OnTrack, Pace, ProgramOnTrack, StudyDay };

export const STUDY_DAY_LABELS: Record<StudyDay, { short: string; long: string }> = {
  mon: { short: 'Mon', long: 'Monday' },
  tue: { short: 'Tue', long: 'Tuesday' },
  wed: { short: 'Wed', long: 'Wednesday' },
  thu: { short: 'Thu', long: 'Thursday' },
  fri: { short: 'Fri', long: 'Friday' },
  sat: { short: 'Sat', long: 'Saturday' },
  sun: { short: 'Sun', long: 'Sunday' },
};
export const DAYS = Object.keys(STUDY_DAY_LABELS) as StudyDay[];

/** Time a week, in minutes: the chips on the goal form. */
export const WEEKLY_PRESETS = [60, 120, 180, 300] as const;

/** Plain words for each pace, and the tone of its badge. Never a grade, never a telling-off. */
export const PACE: Record<Pace, { label: string; tone: 'green' | 'gold' | 'neutral'; line: string }> = {
  not_started: { label: 'Not started', tone: 'neutral', line: 'Your first lesson is waiting. A few minutes is enough to begin.' },
  on_track: { label: 'On track', tone: 'green', line: 'You’re keeping a good pace. Keep going.' },
  behind: { label: 'A little behind', tone: 'gold', line: 'You’re a little behind, and that’s fine. A few short sessions will get you level.' },
  far_behind: { label: 'Falling behind', tone: 'gold', line: 'Life gets busy. Start with the next item below: one at a time is how people catch up.' },
  completed: { label: 'Done', tone: 'green', line: 'You’ve finished. Well done for seeing it through.' },
};

export const isBehind = (pace: Pace) => pace === 'behind' || pace === 'far_behind';

/** "Mon, Wed and Sat". */
export function studyDaysText(days: StudyDay[]): string {
  const sorted = DAYS.filter((d) => days.includes(d));
  if (sorted.length === 7) return 'every day';
  const names = sorted.map((d) => STUDY_DAY_LABELS[d].short);
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** "2 h a week", "90 min a week". */
export function weeklyText(minutes: number): string {
  if (minutes < 60) return `${minutes} min a week`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min a week` : `${h} h a week`;
}

/** "Mon, Wed and Sat at 20:00 · 2 h a week". */
export function planText(goal: Pick<LearningGoal, 'studyDays' | 'studyTime' | 'minutesPerWeek'>): string {
  const days = studyDaysText(goal.studyDays);
  return `${days ? `${days.charAt(0).toUpperCase()}${days.slice(1)}` : ''}${goal.studyTime ? ` at ${goal.studyTime}` : ''} · ${weeklyText(goal.minutesPerWeek)}`;
}

/** Where a catch-up item opens. */
export const catchUpHref = (i: CatchUpItem) => `/learn/${i.enrollmentId}/${i.itemId}`;

/** "12 MB", "850 KB": sizes for the data estimate under a video. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 10_000_000) return `${Math.round(bytes / 1_000_000)} MB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1).replace(/\.0$/, '')} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}
