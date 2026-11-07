'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sendCheckIn } from '@/app/actions/engagement';
import { Icon } from '@/components/ui/icons';
import { Badge, Card, cx, Notice } from '@/components/ui/primitives';
import {
  CHECK_IN_MAX,
  CHECK_IN_MAX_PEOPLE,
  CHECK_IN_MIN,
  CHECK_IN_STARTERS,
  type CohortEngagement,
  daysAgo,
  type EngagementRow,
  PACE_LABELS,
  quietText,
  RISK_HINTS,
  RISK_LABELS,
  RISK_ORDER,
  RISK_TONES,
  type RiskLevel,
  summaryCount,
} from '@/lib/engagement';
import { useFocusTrap } from '@/lib/use-focus-trap';

type Filter = 'all' | RiskLevel;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Who is on track and who might need a hand, with a personal check-in for the people chosen (LRN-9). */
export function EngagementBoard({ cohortId, data }: { cohortId: string; data: CohortEngagement }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const selectAll = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => (filter === 'all' ? data.items : data.items.filter((r) => r.risk === filter)), [data.items, filter]);
  const chosen = data.items.filter((r) => selected.has(r.userId));
  const visibleChosen = rows.filter((r) => selected.has(r.userId)).length;
  const allVisible = rows.length > 0 && visibleChosen === rows.length;

  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = visibleChosen > 0 && !allVisible;
  }, [visibleChosen, allVisible]);

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleVisible = (on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      for (const r of rows) {
        if (on) next.add(r.userId);
        else next.delete(r.userId);
      }
      return next;
    });

  const filterLabel = filter === 'all' ? 'everyone' : RISK_LABELS[filter].toLowerCase();

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Show learners by how they are doing" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {RISK_ORDER.map((risk) => {
          const n = summaryCount(data.summary, risk);
          const on = filter === risk;
          return (
            <button
              key={risk}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(on ? 'all' : risk)}
              className={cx(
                'rounded-[var(--radius-card)] bg-card p-4 text-left shadow-[var(--shadow-card)] ring-1 transition-colors hover:ring-line-heavy',
                on ? 'ring-2 ring-primary' : 'ring-line',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <Badge tone={RISK_TONES[risk]}>{RISK_LABELS[risk]}</Badge>
                {on && <Icon name="check" className="h-4 w-4 text-link" />}
              </span>
              <span className="mt-2 block font-display text-[28px] font-extrabold leading-none text-ink">{n}</span>
              <span className="mt-1 block text-[12.5px] leading-snug text-muted">{RISK_HINTS[risk]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-muted">
          {filter === 'all' ? `Showing all ${plural(data.items.length, 'learner')}, most in need of a hand first.` : `Showing ${rows.length} of ${data.items.length}: ${filterLabel}.`}
          {filter !== 'all' && (
            <>
              {' '}
              <button type="button" onClick={() => setFilter('all')} className="min-h-10 font-semibold text-link hover:underline">
                Show everyone
              </button>
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13.5px] text-body" aria-live="polite">
            {selected.size === 0 ? 'Nobody selected' : `${plural(selected.size, 'person', 'people')} selected`}
          </span>
          {/* On phones the table's header (and its select-all box) is hidden. */}
          {rows.length > 0 && (
            <button type="button" onClick={() => toggleVisible(!allVisible)} className="min-h-10 px-1 text-[13.5px] font-semibold text-link hover:underline sm:hidden">
              {allVisible ? 'Unselect everyone shown' : 'Select everyone shown'}
            </button>
          )}
          {selected.size > 0 && (
            <button type="button" onClick={() => setSelected(new Set())} className="min-h-10 px-1 text-[13.5px] font-semibold text-link hover:underline">
              Clear
            </button>
          )}
          <button
            ref={opener}
            type="button"
            disabled={selected.size === 0}
            onClick={() => {
              setResult(null);
              setComposing(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line-heavy"
          >
            <Icon name="mail" className="h-4 w-4" />
            Send a check-in
          </button>
        </div>
      </div>

      <div aria-live="polite">{result && <Notice tone="success">{result}</Notice>}</div>

      {data.items.length === 0 ? (
        <Card className="p-6 text-[14.5px] text-muted">Nobody has joined this cohort yet.</Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-[14.5px] text-muted">Nobody in this group right now.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="stack-table w-full min-w-[960px] text-left text-[13.5px]">
            <caption className="sr-only">Learners in this cohort and how they are doing ({filterLabel})</caption>
            <thead className="bg-surface font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <input
                      ref={selectAll}
                      type="checkbox"
                      checked={allVisible}
                      onChange={(e) => toggleVisible(e.target.checked)}
                      aria-label={`Select all ${rows.length} shown`}
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                    Learner
                  </span>
                </th>
                <th scope="col" className="px-3 py-3">
                  Pace
                </th>
                <th scope="col" className="px-3 py-3">
                  Progress
                </th>
                <th scope="col" className="px-3 py-3">
                  Last active
                </th>
                <th scope="col" className="px-3 py-3">
                  Attendance
                </th>
                <th scope="col" className="px-3 py-3">
                  Goal
                </th>
                <th scope="col" className="px-3 py-3">
                  Last reminder
                </th>
                <th scope="col" className="px-3 py-3">
                  Last check-in
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <Row key={r.userId} row={r} checked={selected.has(r.userId)} onToggle={(on) => toggle(r.userId, on)} />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {composing && (
        <CheckInDialog
          cohortId={cohortId}
          people={chosen}
          onClose={() => {
            setComposing(false);
            opener.current?.focus();
          }}
          onSent={(sent) => {
            setComposing(false);
            setSelected(new Set());
            setResult(`Sent to ${plural(sent, 'learner')}. They’ll find it in their email and in the app under Reminders and check-ins.`);
            opener.current?.focus();
          }}
        />
      )}
    </div>
  );
}

function Row({ row: r, checked, onToggle }: { row: EngagementRow; checked: boolean; onToggle: (on: boolean) => void }) {
  const reminder = daysAgo(r.lastReminderAt);
  const checkIn = daysAgo(r.lastCheckInAt);
  return (
    <tr data-learner={r.name} className={cx(checked && 'bg-success-tint/40')}>
      <td className="px-4 py-3">
        <span className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            aria-label={`Select ${r.name}`}
            className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
          />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{r.name}</span>
            <span className="mt-0.5 block">
              <Badge tone={RISK_TONES[r.risk]}>{RISK_LABELS[r.risk]}</Badge>
            </span>
          </span>
        </span>
      </td>
      <td data-label="Pace" className="px-3 py-3 text-body">
        {PACE_LABELS[r.pace]}
      </td>
      <td data-label="Progress" className="px-3 py-3">
        <ProgressBar progress={r.progressPct} expected={r.expectedPct} />
      </td>
      <td data-label="Last active" className="px-3 py-3 text-body">
        {quietText(r)}
      </td>
      <td data-label="Attendance" className="px-3 py-3 text-body">
        {r.attendancePct === null ? <span className="text-muted">No classes yet</span> : `${r.attendancePct}%`}
      </td>
      <td data-label="Goal" className="px-3 py-3 text-body">
        {r.goalSet ? 'Set' : <span className="text-muted">Not yet</span>}
      </td>
      <td data-label="Last reminder" className="px-3 py-3 text-body">
        {reminder ?? <span className="text-muted">None</span>}
      </td>
      <td data-label="Last check-in" className="px-3 py-3 text-body">
        {checkIn ?? <span className="text-muted">None</span>}
      </td>
    </tr>
  );
}

/** Progress so far against where the calendar expects them: a bar with a marker, and the numbers in words. */
export function ProgressBar({ progress, expected }: { progress: number; expected: number | null }) {
  const p = Math.max(0, Math.min(100, progress));
  const e = expected === null ? null : Math.max(0, Math.min(100, expected));
  return (
    <span className="flex min-w-[150px] flex-col gap-1">
      <span aria-hidden className="relative block h-2 w-full max-w-[140px] rounded-full bg-surface ring-1 ring-line">
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${p}%` }} />
        {e !== null && <span className="absolute -top-1 h-4 w-[2px] -translate-x-1/2 rounded-full bg-ink" style={{ left: `${e}%` }} />}
      </span>
      <span className="text-[12.5px] text-body">
        {p}% done{e !== null && <span className="text-muted"> · expected {e}%</span>}
      </span>
    </span>
  );
}

function CheckInDialog({ cohortId, people, onClose, onSent }: { cohortId: string; people: EngagementRow[]; onClose: () => void; onSent: (sent: number) => void }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const noteId = useId();
  const countId = useId();
  useFocusTrap(panel);

  const close = useRef(onClose);
  useEffect(() => {
    close.current = sending ? () => {} : onClose;
  });
  useEffect(() => {
    box.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);

  const length = message.trim().length;
  const tooMany = people.length > CHECK_IN_MAX_PEOPLE;
  const names = people.map((p) => p.name);
  const to = names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${plural(names.length - 3, 'other')}`;

  const send = async () => {
    if (tooMany) return setError(`Choose ${CHECK_IN_MAX_PEOPLE} people or fewer at a time.`);
    if (length < CHECK_IN_MIN) return setError(`Write a little more: at least ${CHECK_IN_MIN} characters.`);
    if (length > CHECK_IN_MAX) return setError(`Keep it to ${CHECK_IN_MAX} characters or fewer.`);
    setSending(true);
    setError(null);
    const res = await sendCheckIn(
      cohortId,
      people.map((p) => p.userId),
      message,
    );
    setSending(false);
    if (!res.ok) return setError(res.error);
    onSent(res.sent);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={noteId}>
      <div className="absolute inset-0 bg-forest/35 backdrop-blur-[2px]" onClick={() => close.current()} aria-hidden />
      <div ref={panel} className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[var(--radius-card)] bg-page shadow-[var(--shadow-panel)] sm:rounded-[var(--radius-card)]">
        <header className="flex items-center gap-2 border-b border-line bg-card px-4 py-3 sm:px-5">
          <h2 id={titleId} className="min-w-0 flex-1 text-[17px] font-bold">
            Send a check-in
          </h2>
          <button type="button" onClick={() => close.current()} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </header>
        <form
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <p className="text-[13.5px] text-body">
            <span className="font-semibold text-ink">To {plural(people.length, 'learner')}:</span> {to}
          </p>
          <p id={noteId} className="text-[13px] text-muted">
            It goes by email and appears in the app under Reminders and check-ins, with your name. Each person gets it on their own; nobody sees who else it went to.
          </p>

          <fieldset className="space-y-2">
            <legend className="text-[13px] font-semibold text-ink">Start from a message</legend>
            <div className="flex flex-wrap gap-2">
              {CHECK_IN_STARTERS.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => {
                    setMessage(s.text);
                    setError(null);
                    box.current?.focus();
                  }}
                  className="min-h-10 rounded-full bg-card px-3.5 text-[13px] font-semibold text-link ring-1 ring-line hover:bg-surface"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor={`${titleId}-message`} className="text-[13px] font-semibold text-ink">
              Your message
            </label>
            <textarea
              ref={box}
              id={`${titleId}-message`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              maxLength={CHECK_IN_MAX}
              aria-describedby={countId}
              aria-invalid={error ? true : undefined}
              placeholder="Write as you would to them in person. Plain text."
              className="block w-full rounded-[var(--radius-field)] bg-card px-3 py-2.5 text-[15px] leading-relaxed text-ink ring-1 ring-line-strong focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p id={countId} className={cx('text-right text-[12.5px]', length > 0 && length < CHECK_IN_MIN ? 'text-gold-ink' : 'text-muted')}>
              {length} of {CHECK_IN_MAX} characters{length > 0 && length < CHECK_IN_MIN ? `, at least ${CHECK_IN_MIN}` : ''}
            </p>
          </div>

          {error && <Notice tone="error">{error}</Notice>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => close.current()} disabled={sending} className="h-11 rounded-full px-5 text-[14px] font-semibold text-body ring-1 ring-line hover:bg-surface disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={sending} className="h-11 rounded-full bg-primary px-5 text-[14px] font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
              {sending ? 'Sending…' : `Send to ${plural(people.length, 'learner')}`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
