/**
 * Shared wording and helpers for staying on track (LRN-9), staff side: who is at risk in a cohort,
 * personal check-ins and the completion funnel. Type-only imports, so client components can use it.
 */
import type { CohortEngagement, CompletionFunnel, EngagementRow, Pace, RiskLevel } from '@dreamlab/contracts';
import type { ApiResult } from './gateway';

export type { CohortEngagement, CompletionFunnel, EngagementRow, Pace, RiskLevel };

export const RISK_ORDER: RiskLevel[] = ['ok', 'watch', 'at_risk', 'inactive'];

export const RISK_LABELS: Record<RiskLevel, string> = {
  ok: 'On track',
  watch: 'Watch',
  at_risk: 'At risk',
  inactive: 'Inactive',
};

/** What each level means, in the words staff see under the tiles. */
export const RISK_HINTS: Record<RiskLevel, string> = {
  ok: 'Keeping pace',
  watch: 'Behind, or quiet for 5 to 9 days',
  at_risk: 'Well behind, or quiet for 10 to 20 days',
  inactive: 'Quiet for 21 days or more',
};

export const RISK_TONES: Record<RiskLevel, 'neutral' | 'green' | 'gold' | 'danger'> = {
  ok: 'green',
  watch: 'gold',
  at_risk: 'danger',
  inactive: 'neutral',
};

export const PACE_LABELS: Record<Pace, string> = {
  not_started: 'Not started',
  on_track: 'On pace',
  behind: 'Behind',
  far_behind: 'Well behind',
  completed: 'Completed',
};

export const summaryCount = (s: CohortEngagement['summary'], risk: RiskLevel) => ({ ok: s.ok, watch: s.watch, at_risk: s.atRisk, inactive: s.inactive })[risk];

/** "Active today", "Quiet for 12 days", "No activity yet". */
export function quietText(row: Pick<EngagementRow, 'daysQuiet' | 'lastActiveAt'>): string {
  if (!row.lastActiveAt) return 'No activity yet';
  if (row.daysQuiet <= 0) return 'Active today';
  return `Quiet for ${row.daysQuiet} ${row.daysQuiet === 1 ? 'day' : 'days'}`;
}

/** "Today", "Yesterday", "5 days ago", or a date after a month. */
export function daysAgo(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days <= 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The API this web app talks to may be older than the feature: an unknown route answers 404 (or 405,
 * 501) with no error code. A 404 with a code (`course_not_found`, say) comes from the feature itself.
 */
export const featureMissing = (res: ApiResult<unknown>) => !res.ok && (res.status === 404 || res.status === 405 || res.status === 501) && !res.error?.code;

export const CHECK_IN_MIN = 10;
export const CHECK_IN_MAX = 1000;
export const CHECK_IN_MAX_PEOPLE = 200;

/** Ready-made starting points for a check-in: warm, specific, no guilt. Staff edit them before sending. */
export const CHECK_IN_STARTERS: { title: string; text: string }[] = [
  {
    title: 'A quiet couple of weeks',
    text: 'Hi, I noticed it has been a quiet couple of weeks. Is anything getting in the way? Reply to me or come to Thursday’s class and we’ll make a plan together.',
  },
  {
    title: 'Finding time',
    text: 'Hi, I wanted to check in. Life gets busy, and that’s fine. If finding time is hard at the moment, even 20 minutes on one lesson this week will help. Tell me what would make it easier and I’ll help where I can.',
  },
  {
    title: 'Getting back in',
    text: 'Hi, it’s good to have you in this cohort. The next few lessons are a good place to pick things up again, and you don’t need to catch up on everything at once. Let me know if you’d like help choosing where to start.',
  },
];
