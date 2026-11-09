import Link from 'next/link';
import { ItemIcon } from '@/components/learning/course-ui';
import { Badge, Card, cx, Eyebrow } from '@/components/ui/primitives';
import { catchUpHref, isBehind, type OnTrack, PACE, type ProgramOnTrack } from '@/lib/engagement';
import { formatMinutes, ITEM_LABELS } from '@/lib/learning';

/*
 * Staying on track (LRN-9), shown to the learner: their pace in plain words, where they are against
 * where the calendar expects them, and, when they've slipped, the few items that get them level.
 * Kind words only: no red, no counts of what's overdue.
 */

/** Progress so far, with a mark where the cohort's calendar expects them to be. */
function PaceBar({ progressPct, expectedPct, label }: { progressPct: number; expectedPct: number | null; label: string }) {
  return (
    <div className="relative">
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPct}
        aria-label={label}
        aria-valuetext={expectedPct === null ? `${progressPct}% done` : `${progressPct}% done; about ${expectedPct}% expected by now`}
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progressPct}%` }} />
      </div>
      {expectedPct !== null && (
        <span aria-hidden className="absolute -top-1 h-[18px] w-[3px] -translate-x-1/2 rounded-full bg-forest ring-2 ring-card" style={{ left: `${Math.min(99, Math.max(1, expectedPct))}%` }} />
      )}
    </div>
  );
}

export function OnTrackCard({
  data,
  name,
  showGoal = true,
}: {
  data: OnTrack | ProgramOnTrack;
  /** The programme or course, for labels. */
  name: string;
  /** Off where the goal card is already on the page. */
  showGoal?: boolean;
}) {
  const pace = PACE[data.pace];
  const behind = isBehind(data.pace);
  const catchUpWeek = 'catchUpWeek' in data && data.catchUpWeek;
  const total = data.catchUp.reduce((s, i) => s + (i.minutes ?? 0), 0);
  const multiCourse = new Set(data.catchUp.map((i) => i.courseSlug)).size > 1 || 'certificate' in data;

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <section className="space-y-4" aria-label={`Your pace in ${name}`} data-pace={data.pace}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Eyebrow tone="green">Your pace</Eyebrow>
            <h3 className="text-[19px] font-bold">{pace.label}</h3>
          </div>
          <Badge tone={pace.tone}>{pace.label}</Badge>
        </div>
        <p className="text-[14.5px] leading-relaxed text-body">{pace.line}</p>

        {catchUpWeek && (
          <p className="rounded-[var(--radius-field)] bg-sky-tint px-4 py-3 text-[14px] leading-relaxed text-sky-ink ring-1 ring-sky-line">
            <span className="font-semibold">Catch-up week:</span> no new lessons. A good week to get level.
          </p>
        )}

        {data.pace !== 'not_started' && (
          <div className="space-y-2">
            <PaceBar progressPct={data.progressPct} expectedPct={data.expectedPct} label={`Progress in ${name}`} />
            <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px] text-muted">
              <span>
                <span className="font-semibold text-ink">{data.progressPct}% done</span>
                {data.expectedPct !== null && data.pace !== 'completed' && <> · about {data.expectedPct}% expected by now</>}
              </span>
              {behind && data.daysQuiet >= 3 && <span>Last here {data.daysQuiet} days ago</span>}
            </p>
          </div>
        )}

        {showGoal && behind && data.goal && (
          <blockquote className="border-l-4 border-gold-line pl-4 text-[14.5px] leading-relaxed text-ink">
            <span className="text-muted">You said: </span>“{data.goal.why}”
          </blockquote>
        )}

        {data.catchUp.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[15px] font-bold text-ink">{behind ? 'Do these to get back on track' : data.pace === 'not_started' ? 'Start here' : 'Up next'}</h4>
            <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-field)] ring-1 ring-line" aria-label={behind ? 'Your catch-up plan' : 'Up next'}>
              {data.catchUp.map((i) => (
                <li key={i.itemId} className="flex items-center gap-3 bg-card px-3 py-3 sm:px-4">
                  <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success-tint text-link ring-1 ring-success-line">
                    <ItemIcon type={i.type} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold leading-snug text-ink">{i.title}</span>
                    <span className="block text-[12.5px] text-muted">
                      {ITEM_LABELS[i.type]}
                      {i.minutes ? ` · ${i.minutes} min` : ''} · {multiCourse ? i.courseTitle : i.moduleTitle}
                    </span>
                  </span>
                  <Link
                    href={catchUpHref(i)}
                    className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
                  >
                    Start
                    <span className="sr-only"> {i.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
            {total > 0 && <p className="text-[12.5px] text-muted">About {formatMinutes(total)} in all. One at a time is fine.</p>}
          </div>
        )}
      </section>
    </Card>
  );
}

type Step = { key: string; label: string; done: boolean; href: string | null; hint?: string };

/** The first week's steps: a goal, a first lesson, hello to the circle. Gone once they're done. */
export function FirstWeekChecklist({
  data,
  enrollmentId,
  goalHref,
  circleHref,
  lessonHref = null,
}: {
  data: OnTrack | ProgramOnTrack;
  enrollmentId: string;
  goalHref: string;
  circleHref: string | null;
  /** Where "Finish your first lesson" goes when there is no catch-up list (someone on track has none). */
  lessonHref?: string | null;
}) {
  const o = data.onboarding;
  if (o.done) return null;
  const first = data.catchUp[0];
  const steps: Step[] = [
    { key: 'goal', label: 'Set your goal', done: o.goalSet, href: goalHref, hint: 'Why you’re here and when you’ll study' },
    { key: 'first', label: 'Finish your first lesson', done: o.firstItemDone, href: first ? catchUpHref(first) : lessonHref, hint: first ? `${first.title}${first.minutes ? `, about ${first.minutes} min` : ''}` : undefined },
  ];
  if (o.introducedInCircle !== null) {
    steps.push({ key: 'circle', label: 'Say hello in your Dream Circle', done: o.introducedInCircle, href: circleHref, hint: 'A line about you and what you’re working on' });
  }
  const done = steps.filter((s) => s.done).length;

  return (
    <Card className="space-y-3 p-5 sm:p-6">
      <section className="space-y-3" aria-labelledby={`first-week-${enrollmentId}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={`first-week-${enrollmentId}`} className="text-[17px] font-bold">
            Your first week
          </h3>
          <span className="font-mono text-[12px] text-muted">
            {done} of {steps.length} done
          </span>
        </div>
        <p className="text-[13.5px] text-muted">Small steps that help people settle in.</p>
        <ul className="space-y-2" aria-label="First-week steps">
          {steps.map((s) => (
            <StepRow key={s.key} step={s} />
          ))}
        </ul>
      </section>
    </Card>
  );
}

function StepRow({ step }: { step: Step }) {
  const tick = (
    <span
      aria-hidden
      className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold', step.done ? 'bg-primary text-white' : 'bg-card ring-1 ring-line-heavy')}
    >
      {step.done ? '✓' : ''}
    </span>
  );
  const text = (
    <span className="min-w-0 flex-1">
      <span className={cx('block text-[14.5px] font-semibold', step.done ? 'text-muted line-through decoration-line-heavy' : 'text-ink')}>{step.label}</span>
      {!step.done && step.hint && <span className="block text-[12.5px] text-muted">{step.hint}</span>}
    </span>
  );
  const status = <span className="sr-only">{step.done ? ' (done)' : ' (not done yet)'}</span>;
  return (
    <li>
      {step.href && !step.done ? (
        <Link href={step.href} className="flex min-h-12 items-center gap-3 rounded-[var(--radius-field)] bg-surface px-3 py-2 ring-1 ring-line hover:ring-primary">
          {tick}
          {text}
          {status}
          <span aria-hidden className="text-link">
            →
          </span>
        </Link>
      ) : (
        <div className="flex min-h-12 items-center gap-3 rounded-[var(--radius-field)] px-3 py-2">
          {tick}
          {text}
          {status}
        </div>
      )}
    </li>
  );
}

/** The way to the programme's certificate: every step, done or not, with where to do it. */
export function CertificatePath({ certificate, name }: { certificate: ProgramOnTrack['certificate']; name: string }) {
  if (certificate.total === 0) return null;
  const pct = Math.round((certificate.done / certificate.total) * 100);
  return (
    <Card className="space-y-3 p-5 sm:p-6">
      <section className="space-y-3" aria-label={`Your way to the certificate in ${name}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[17px] font-bold">Your way to the certificate</h3>
          <span className="font-mono text-[12px] text-muted">
            {certificate.done} of {certificate.total} done
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${certificate.done} of ${certificate.total} steps done`}>
          <div className="dl-bar h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        <ul className="space-y-1.5">
          {certificate.steps.map((s) => (
            <StepRow key={s.key} step={{ key: s.key, label: s.label, done: s.done, href: s.href && s.href.startsWith('/') && !s.href.startsWith('//') ? s.href : null }} />
          ))}
        </ul>
      </section>
    </Card>
  );
}

/** A course's pace in a line or two, for My learning: the catch-up items when behind, the goal shown back. */
export function CoursePace({ data, enrollmentId, courseTitle }: { data: OnTrack; enrollmentId: string; courseTitle: string }) {
  if (data.pace === 'completed') return null;
  const pace = PACE[data.pace];
  const behind = isBehind(data.pace);
  return (
    <div className="space-y-2 border-t border-line pt-3" data-pace={data.pace}>
      <p className="flex flex-wrap items-center gap-2 text-[13px] text-body">
        <Badge tone={pace.tone}>{pace.label}</Badge>
        {behind && <span>A few short sessions will get you level.</span>}
      </p>
      {behind && data.goal && (
        <p className="border-l-4 border-gold-line pl-3 text-[13.5px] leading-relaxed text-ink">
          <span className="text-muted">You said: </span>“{data.goal.why}”
        </p>
      )}
      {behind && data.catchUp.length > 0 && (
        <div className="space-y-1">
          <p className="text-[13px] font-semibold text-ink">Do these to get back on track</p>
          <ol className="space-y-1" aria-label={`Catch-up plan for ${courseTitle}`}>
            {data.catchUp.map((i) => (
              <li key={i.itemId}>
                <Link href={catchUpHref(i)} className="flex min-h-10 items-center gap-2 rounded-lg px-1 text-[13.5px] hover:bg-surface">
                  <ItemIcon type={i.type} className="h-4 w-4 text-link" />
                  <span className="min-w-0 flex-1 truncate text-ink">{i.title}</span>
                  {i.minutes ? <span className="shrink-0 font-mono text-[11px] text-muted">{i.minutes} min</span> : null}
                  <span className="shrink-0 font-semibold text-link">
                    Start<span className="sr-only"> {i.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
      {!data.goal && (
        <Link
          href={`/learn/${enrollmentId}#goal-${enrollmentId}`}
          aria-label={`Set your goal for this course: ${courseTitle}`}
          className="inline-flex min-h-10 items-center text-[13.5px] font-semibold text-link hover:underline"
        >
          Set your goal for this course
        </Link>
      )}
    </div>
  );
}
