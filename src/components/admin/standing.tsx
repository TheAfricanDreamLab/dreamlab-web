import type { StatusChange, UserStatus } from '@dreamlab/contracts';
import { Badge } from '@/components/ui/primitives';
import { longDate } from '@/lib/errors';
import { dateTime } from '@/lib/learning';

/** Active, suspended (until when) or banned (PLT-2). */
export function StandingBadge({ status, until }: { status: UserStatus; until?: string | null }) {
  if (status === 'banned') return <Badge tone="danger">Banned</Badge>;
  const end = longDate(until);
  if (status === 'suspended') return <Badge tone="gold">{end ? `Suspended to ${end}` : 'Suspended'}</Badge>;
  return <Badge tone="green">Active</Badge>;
}

const VERB: Record<UserStatus, string> = { active: 'Reinstated', suspended: 'Suspended', banned: 'Banned' };

/** The latest suspension, ban or reinstatement: what, until when, who, why and what they were told. */
export function StandingSummary({ change }: { change: StatusChange }) {
  const rows: [string, string][] = [
    ['Why', change.reason || '—'],
    ...(change.message ? ([['They were told', `“${change.message}”`]] as [string, string][]) : []),
  ];
  return (
    <div className="space-y-2 rounded-[var(--radius-field)] bg-surface p-4 text-[13.5px] ring-1 ring-line">
      <p className="font-semibold text-ink">
        {VERB[change.status]}
        {change.status === 'suspended' && (change.until ? (longDate(change.until) ? ` until ${longDate(change.until)}` : '') : ' until lifted')}
        <span className="font-normal text-muted">
          {' '}
          · {dateTime(change.at)}
          {change.by && ` by ${change.by.name}`}
        </span>
      </p>
      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="shrink-0 text-muted">{k}:</dt>
            <dd className="min-w-0 break-words text-body">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
