'use client';

import { useId, useState, useTransition } from 'react';
import { setCircleSharing } from '@/app/actions/engagement';
import { Switch } from '@/components/engagement/save-data-toggle';
import { Card, cx, Notice } from '@/components/ui/primitives';
import type { CircleProgress } from '@/lib/engagement';

/*
 * A Dream Circle's week (LRN-9): the members who choose to share it, each with their active days, what
 * they finished and how far through they are. Nobody shares unless they turn it on, and the list is
 * in name order: it's for encouraging each other, not for comparing.
 */

const weekOf = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

function Days({ active, name }: { active: number; name: string }) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`${name}: active ${active} ${active === 1 ? 'day' : 'days'} of 7 this week`}>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} aria-hidden className={cx('h-2.5 w-2.5 rounded-full', i < active ? 'bg-primary' : 'bg-card ring-1 ring-line-heavy')} />
      ))}
    </span>
  );
}

export function CircleProgressPanel({ circleId, initial, canShare, meId }: { circleId: string; initial: CircleProgress; canShare: boolean; meId: string | null }) {
  const [data, setData] = useState(initial);
  // A refresh brings newer progress (sharing may have changed in another tab): take it in. A saved
  // toggle already updated `data`, and the refresh that follows it agrees.
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setData(initial);
  }
  const [error, setError] = useState<string | null>(null);
  const [said, setSaid] = useState('');
  const [pending, start] = useTransition();
  const id = useId();
  const members = [...data.members].sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
  const week = weekOf(data.weekStart);

  const toggle = (share: boolean) => {
    setError(null);
    setSaid('');
    start(async () => {
      const res = await setCircleSharing(circleId, share).catch(() => ({ ok: false as const, error: 'We couldn’t reach the server. Check your connection and try again.' }));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setData(res.data);
      setSaid(res.data.sharing ? 'Saved. Your circle can now see your week.' : 'Saved. Your progress is private again.');
    });
  };

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <section className="space-y-4" aria-labelledby={`${id}-title`}>
        <div className="space-y-1">
          <h2 id={`${id}-title`} className="text-[17px] font-bold text-ink">
            This week
          </h2>
          <p className="text-[13.5px] text-muted">
            {week ? `Since Monday ${week}. ` : ''}How the people who share are getting on. A good reason to check in on each other.
          </p>
        </div>

        {canShare && (
          <div className="space-y-2 rounded-[var(--radius-field)] bg-surface p-3 ring-1 ring-line sm:p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p id={`${id}-share`} className="text-[14.5px] font-semibold text-ink">
                  Share my progress with this circle
                </p>
                <p id={`${id}-share-desc`} className="text-[13px] leading-relaxed text-muted">
                  Your circle, its mentor and your cohort team see how many days you were active this week, how many items you finished and how far through you
                  are. Never your answers, marks or anything you wrote. Turn it off any time.
                </p>
              </div>
              <Switch on={data.sharing} onChange={toggle} labelledBy={`${id}-share`} describedBy={`${id}-share-desc`} disabled={pending} />
            </div>
            <p className="text-[12.5px] text-link" aria-live="polite">
              {pending ? 'Saving…' : said}
            </p>
          </div>
        )}
        {error && <Notice tone="error">{error}</Notice>}

        {members.length === 0 ? (
          <p className="text-[14px] text-muted">
            {canShare && !data.sharing ? 'Nobody is sharing their week yet. You could be the first.' : 'Nobody is sharing their week yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-field)] ring-1 ring-line" aria-label="Members sharing their week">
            {members.map((m) => (
              <li key={m.userId} className="grid gap-2 bg-card px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-4">
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-semibold text-ink">
                    {m.name}
                    {m.userId === meId && <span className="font-normal text-muted"> (you)</span>}
                  </span>
                  <span className="block text-[12.5px] text-muted">
                    {m.itemsCompletedThisWeek === 0 ? 'Nothing finished yet this week' : `${m.itemsCompletedThisWeek} ${m.itemsCompletedThisWeek === 1 ? 'item' : 'items'} finished this week`}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Days active={m.activeDaysThisWeek} name={m.name} />
                  <span className="flex min-w-[8.5rem] items-center gap-2">
                    <span
                      className="h-1.5 w-20 overflow-hidden rounded-full bg-line"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={m.progressPct}
                      aria-label={`${m.name}: ${m.progressPct}% through`}
                    >
                      <span className="block h-full rounded-full bg-gold" style={{ width: `${m.progressPct}%` }} />
                    </span>
                    <span className="font-mono text-[11.5px] text-muted">{m.progressPct}%</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {data.notSharing > 0 && (
          <p className="text-[13px] text-muted">
            {data.notSharing === 1 ? '1 member keeps theirs private.' : `${data.notSharing} members keep theirs private.`} That’s fine too.
          </p>
        )}
      </section>
    </Card>
  );
}
