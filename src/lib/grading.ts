/**
 * Shared wording for faculty grading (LRN-3). Type-only imports from the contracts, so client
 * components can use this without pulling in zod.
 */
import type { Grade, GradingQueueItem, GradingStatus, ReleasedGrade, SubmissionForGrading } from '@dreamlab/contracts';

export type { Grade, GradingQueueItem, GradingStatus, ReleasedGrade, SubmissionForGrading };

/** The same levels as the contracts' RUBRIC_LEVEL_LABELS (0–4). */
export const RUBRIC_LEVELS: { level: number; label: string; short: string }[] = [
  { level: 0, label: 'Not yet shown', short: 'Not yet' },
  { level: 1, label: 'Beginning', short: 'Beginning' },
  { level: 2, label: 'Approaching', short: 'Approaching' },
  { level: 3, label: 'Meets the standard', short: 'Meets' },
  { level: 4, label: 'Exceeds the standard', short: 'Exceeds' },
];
export const RUBRIC_MAX_LEVEL = 4;
export const levelLabel = (level: number | undefined) => RUBRIC_LEVELS.find((l) => l.level === level)?.label ?? '—';

export const GRADING_STATUS_LABELS: Record<GradingStatus, string> = {
  awaiting: 'Awaiting grading',
  draft: 'Draft grade',
  released: 'Released',
};

export const GRADING_STATUS_TONES: Record<GradingStatus, 'neutral' | 'green' | 'gold' | 'danger'> = {
  awaiting: 'gold',
  draft: 'neutral',
  released: 'green',
};

/** Links learners submit are shown only when they are web links (older records may hold anything). */
export const webLink = (link: string | null | undefined): string | null => (link && /^https?:\/\//i.test(link) ? link : null);

/** "84" or "84.5": scores keep one decimal only when they have one. */
export const formatScore = (score: number) => (Number.isInteger(score) ? String(score) : score.toFixed(1));
