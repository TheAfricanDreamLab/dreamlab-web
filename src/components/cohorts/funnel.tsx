import { FUNNEL_STAGE_LABELS } from '@dreamlab/contracts';
import { Card } from '@/components/ui/primitives';
import type { CompletionFunnel } from '@/lib/engagement';

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);
const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;
const weekDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** The biggest fall from one stage to the next, or null when nobody fell away. */
export function biggestDrop(stages: CompletionFunnel['stages']): { from: string; to: string; lost: number } | null {
  let best: { from: string; to: string; lost: number } | null = null;
  for (let i = 1; i < stages.length; i++) {
    const lost = stages[i - 1]!.count - stages[i]!.count;
    if (lost > 0 && (!best || lost > best.lost)) best = { from: label(stages[i - 1]!), to: label(stages[i]!), lost };
  }
  return best;
}

const label = (s: CompletionFunnel['stages'][number]) => s.label || FUNNEL_STAGE_LABELS[s.key];

/** A completion funnel for a cohort or a course (LRN-9): stages, drop-off, what reminders do, weekly activity. */
export function FunnelView({ funnel: f }: { funnel: CompletionFunnel }) {
  const enrolled = f.stages[0]?.count ?? 0;
  const drop = biggestDrop(f.stages);
  const dropIndex = drop ? f.stages.findIndex((s) => label(s) === drop.to) : -1;

  if (enrolled === 0) {
    return <Card className="p-6 text-[14.5px] text-muted">Nobody has enrolled yet, so there is nothing to show.</Card>;
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="funnel-stages" className="space-y-3">
        <h2 id="funnel-stages" className="text-[19px] font-bold">
          How far people get
        </h2>
        <p className="text-[14px] text-body">
          {drop ? (
            <>
              The biggest drop is between {drop.from} and {drop.to}: <strong className="font-semibold text-ink">{people(drop.lost)}</strong>.
            </>
          ) : (
            'Everyone who enrolled is still at the last stage.'
          )}
        </p>
        <Card className="p-4 sm:p-5">
          <ol className="space-y-3.5">
            {f.stages.map((s, i) => {
              const share = pct(s.count, enrolled);
              const isDrop = i === dropIndex;
              return (
                <li key={s.key} data-stage={s.key} className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13.5px]">
                    <span className="font-semibold text-ink">
                      {label(s)}
                      {isDrop && <span className="ml-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-danger-ink">Biggest drop</span>}
                    </span>
                    <span className="text-body">
                      <span className="font-mono text-ink">{s.count}</span>
                      <span className="text-muted"> · {share}% of enrolled</span>
                    </span>
                  </div>
                  <div aria-hidden className="h-3 overflow-hidden rounded-full bg-surface ring-1 ring-line">
                    <div className={isDrop ? 'h-full rounded-full bg-gold' : 'h-full rounded-full bg-primary'} style={{ width: `${Math.max(share, s.count > 0 ? 1 : 0)}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-1 p-5">
          <h3 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">Stopped</h3>
          <p className="font-display text-[28px] font-extrabold leading-none text-ink">{f.dropped}</p>
          <p className="text-[13px] text-body">
            {f.dropped === 0
              ? 'Nobody has been quiet for three weeks without finishing.'
              : `${people(f.dropped)} not finished and quiet for 21 days or more.`}
            {f.medianDropDay !== null && f.dropped > 0 && ` Typically last active on day ${Math.round(f.medianDropDay)} after enrolling.`}
          </p>
        </Card>
        <ReturnCard title="Reminders" sent={f.reminders.sent} back={f.reminders.returnedWithin7Days} what="Sent automatically after a few quiet days" />
        <ReturnCard title="Check-ins" sent={f.checkIns.sent} back={f.checkIns.returnedWithin7Days} what="Personal messages from staff" />
      </div>

      <WeeklyActive weekly={f.weekly.slice(-26)} />
    </div>
  );
}

function ReturnCard({ title, sent, back, what }: { title: string; sent: number; back: number; what: string }) {
  return (
    <Card className="space-y-1 p-5">
      <h3 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">{title}</h3>
      <p className="font-display text-[28px] font-extrabold leading-none text-ink">
        {sent} <span className="text-[14px] font-semibold text-muted">sent</span>
      </p>
      <p className="text-[13px] text-body">
        {sent === 0 ? `${what}. None yet.` : `${back} came back within 7 days (${pct(back, sent)}%). ${what}.`}
      </p>
    </Card>
  );
}

/** Learners active each week: plain SVG bars, with the numbers as a table for anyone who wants them. */
function WeeklyActive({ weekly }: { weekly: CompletionFunnel['weekly'] }) {
  if (weekly.length === 0) return null;
  const max = Math.max(1, ...weekly.map((w) => w.active));
  const W = 640;
  const H = 160;
  const pad = { top: 16, bottom: 24, left: 4, right: 4 };
  const slot = (W - pad.left - pad.right) / weekly.length;
  const barW = Math.max(4, Math.min(28, slot - 4));
  const plotH = H - pad.top - pad.bottom;
  const last = weekly.at(-1)!;
  const peak = weekly.reduce((a, b) => (b.active > a.active ? b : a));
  const summary = `Learners active each week, ${weekly.length} weeks from ${weekDate(weekly[0]!.weekStart)}. Most active: ${peak.active} in the week of ${weekDate(peak.weekStart)}. Last week shown: ${last.active}.`;

  return (
    <section aria-labelledby="funnel-weekly" className="space-y-3">
      <h2 id="funnel-weekly" className="text-[19px] font-bold">
        Active each week
      </h2>
      <Card className="space-y-3 p-4 sm:p-5">
        <p className="text-[13.5px] text-body">{summary}</p>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="block h-auto w-full text-primary">
          <line x1={pad.left} x2={W - pad.right} y1={H - pad.bottom} y2={H - pad.bottom} className="stroke-line-heavy" strokeWidth={1} />
          <line x1={pad.left} x2={W - pad.right} y1={pad.top} y2={pad.top} className="stroke-line" strokeWidth={1} strokeDasharray="3 4" />
          <text x={W - pad.right} y={pad.top - 4} textAnchor="end" className="fill-muted" fontSize={11}>
            {max}
          </text>
          {weekly.map((w, i) => {
            const h = (w.active / max) * plotH;
            const x = pad.left + i * slot + (slot - barW) / 2;
            const y = H - pad.bottom - h;
            return (
              <g key={w.weekStart}>
                <title>{`Week of ${weekDate(w.weekStart)}: ${w.active} active`}</title>
                <rect x={pad.left + i * slot} y={pad.top} width={slot} height={plotH} fill="transparent" />
                {h > 0 && <rect x={x} y={y} width={barW} height={h} rx={Math.min(4, barW / 2)} className="fill-current" />}
              </g>
            );
          })}
          <text x={pad.left} y={H - 6} className="fill-muted" fontSize={11}>
            {weekDate(weekly[0]!.weekStart)}
          </text>
          <text x={W - pad.right} y={H - 6} textAnchor="end" className="fill-muted" fontSize={11}>
            {weekDate(last.weekStart)}
          </text>
        </svg>
        <details className="text-[13.5px]">
          <summary className="min-h-10 cursor-pointer content-center font-semibold text-link">Show the numbers</summary>
          <div className="mt-2 max-h-72 overflow-y-auto rounded-[var(--radius-field)] ring-1 ring-line">
            <table className="w-full text-left">
              <caption className="sr-only">Learners active each week</caption>
              <thead className="bg-surface font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Week of
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {weekly.map((w) => (
                  <tr key={w.weekStart}>
                    <th scope="row" className="px-3 py-1.5 font-normal text-body">
                      {weekDate(w.weekStart)}
                    </th>
                    <td className="px-3 py-1.5 text-right font-mono text-ink">{w.active}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>
    </section>
  );
}
