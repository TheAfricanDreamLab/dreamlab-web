import type { Metadata } from 'next';
import Link from 'next/link';
import { GoalCard } from '@/components/engagement/goal-form';
import { FirstWeekChecklist } from '@/components/engagement/on-track';
import { CountUp } from '@/components/ui/motion';
import { ButtonLink, cx, Notice } from '@/components/ui/primitives';
import { FlashToast } from '@/components/ui/toast';
import { calendarDate, type MyProgram } from '@/lib/cohorts';
import { catchUpHref, isBehind, PACE, type ProgramOnTrack } from '@/lib/engagement';
import { friendlyError } from '@/lib/errors';
import { ITEM_LABELS } from '@/lib/learning';
import { loadCommunity, loadProgrammes, loadTracks } from '../_components/data';
import { Bar, NoProgramme, ProgrammeHeading, sectionHeading, SessionAction, sessionMeta, tzLabel } from '../_components/parts';

export const metadata: Metadata = { title: 'My programme' };

type Search = { searchParams: Promise<{ joined?: string }> };

/**
 * My programme, the overview: what matters this week and the one thing to do next. Courses, the full
 * calendar, pace in full and the community each have their own tab.
 */
export default async function MyProgrammePage({ searchParams }: Search) {
  const { joined } = await searchParams;
  const [res, community] = await Promise.all([loadProgrammes(), loadCommunity()]);
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const items = res.data.items;
  if (items.length === 0) return <NoProgramme />;
  const tracks = await loadTracks(items);
  const circles = community.ok ? community.data.circles : [];

  return (
    <div className="space-y-16">
      {items.map((p, i) => {
        const circle = circles.find((c) => c.cohortId === p.cohort.id);
        return <Overview key={p.enrollment.id} p={p} justJoined={joined === p.enrollment.id} track={tracks[i] ?? null} circleHref={circle ? `/app/circles/${circle.id}` : null} />;
      })}
    </div>
  );
}

/** How far through the programme: the pace figure when there is one, else the courses' average. */
function overallProgress(p: MyProgram, track: ProgramOnTrack | null): number {
  if (track) return track.progressPct;
  if (p.courses.length === 0) return 0;
  return Math.round(p.courses.reduce((s, c) => s + c.progressPct, 0) / p.courses.length);
}

function weekStatus(p: MyProgram): string {
  if (p.cohort.currentWeek) return `Week ${p.cohort.currentWeek} of ${p.calendar.length}`;
  return p.cohort.status === 'closed' ? 'Finished' : `Starts ${calendarDate(p.cohort.startsOn)}`;
}

function Overview({ p, justJoined, track, circleHref }: { p: MyProgram; justJoined: boolean; track: ProgramOnTrack | null; circleHref: string | null }) {
  const id = p.enrollment.id;
  const progress = overallProgress(p, track);
  const started = p.courses.find((c) => c.enrollmentId);

  return (
    <section className="space-y-8" aria-labelledby={`programme-${id}`}>
      {justJoined && <FlashToast clear={['joined']}>You’ve joined {p.cohort.name}. Your first steps are below.</FlashToast>}

      <header className="space-y-3">
        <ProgrammeHeading p={p}>
          <span className="font-mono text-[12.5px] text-muted">{weekStatus(p)}</span>
        </ProgrammeHeading>
        <div className="flex items-center gap-3">
          <Bar pct={progress} label={`Progress in ${p.cohort.name}`} className="flex-1" />
          <span className="shrink-0 font-mono text-[12px] text-muted">
            <CountUp value={progress} />%
          </span>
        </div>
      </header>

      <div className="dl-stagger space-y-10">
        {/* One place for the goal, set or not, so saving it doesn't move it. */}
        {track && <GoalCard compact scope="program" enrollmentId={id} goal={track.goal} welcome={justJoined} title={p.cohort.programTitle} behind={isBehind(track.pace)} />}
        <ThisWeek p={p} track={track} />
        <NextStep p={p} track={track} />
        <NextClass p={p} />
        {track && (
          <FirstWeekChecklist data={track} enrollmentId={id} goalHref={`#goal-${id}`} circleHref={circleHref} lessonHref={started ? `/learn/${started.enrollmentId}` : null} />
        )}
      </div>
    </section>
  );
}

function ThisWeek({ p, track }: { p: MyProgram; track: ProgramOnTrack | null }) {
  const id = p.enrollment.id;
  const catchUpWeek = p.thisWeek?.kind === 'catch_up' || Boolean(track?.catchUpWeek);
  return (
    <section className="space-y-2" aria-labelledby={`week-${id}`}>
      <h3 id={`week-${id}`} className={sectionHeading}>
        This week
      </h3>
      {p.thisWeek ? (
        <>
          <p className="text-[21px] font-bold leading-snug text-ink">{p.thisWeek.focus}</p>
          {p.thisWeek.majorOutput && (
            <p className="text-[14.5px] leading-relaxed text-body">
              <span className="text-muted">Major output: </span>
              {p.thisWeek.majorOutput}
            </p>
          )}
        </>
      ) : (
        <p className="text-[15px] text-body">
          {p.cohort.status === 'closed' ? 'Your cohort has finished. Your steps to the certificate are under Progress.' : `Your cohort starts on ${calendarDate(p.cohort.startsOn)}.`}
        </p>
      )}
      {catchUpWeek && (
        <p className="text-[14px] leading-relaxed text-sky-ink">
          <span className="font-semibold">Catch-up week:</span> no new lessons. A good week to get level.
        </p>
      )}
    </section>
  );
}

/** One thing to do: the first catch-up item when behind (or just starting), else the course in hand. */
function NextStep({ p, track }: { p: MyProgram; track: ProgramOnTrack | null }) {
  const id = p.enrollment.id;
  const item = track?.catchUp[0];
  const course = p.courses.find((c) => c.enrollmentId && c.progressPct < 100);
  const open = p.electives.filter((e) => !e.locked && e.chosen.length === 0);

  const step = item
    ? { title: item.title, meta: `${ITEM_LABELS[item.type]}${item.minutes ? ` · about ${item.minutes} min` : ''} · ${item.courseTitle}`, href: catchUpHref(item), cta: 'Start' }
    : course
      ? {
          title: course.course.title,
          meta: course.progressPct > 0 ? `${course.progressPct}% done · ${course.phase}` : course.phase,
          href: `/learn/${course.enrollmentId}`,
          cta: course.progressPct > 0 ? 'Continue' : 'Start',
        }
      : null;

  return (
    <section className="space-y-3" aria-labelledby={`next-step-${id}`}>
      <h3 id={`next-step-${id}`} className={sectionHeading}>
        Your next step
      </h3>
      {step ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[17px] font-semibold leading-snug text-ink">{step.title}</p>
            <p className="text-[13px] text-muted">{step.meta}</p>
          </div>
          <ButtonLink href={step.href} className="dl-press w-full shrink-0 sm:w-auto sm:px-8">
            {step.cta}
            <span className="sr-only"> {step.title}</span>
          </ButtonLink>
        </div>
      ) : (
        <p className="text-[15px] text-body">
          {p.courses.some((c) => c.enrollmentId) ? 'You’re through your courses for now. The rest of the way to your certificate is under Progress.' : 'Your first course opens soon.'}
        </p>
      )}
      {track && (
        <p className="flex flex-wrap items-center gap-x-2 text-[13.5px] text-muted">
          <span aria-hidden className={cx('h-2 w-2 rounded-full', PACE[track.pace].tone === 'gold' ? 'bg-gold' : PACE[track.pace].tone === 'green' ? 'bg-primary' : 'bg-line-heavy')} />
          <span className="font-semibold text-ink">{PACE[track.pace].label}</span>
          <span aria-hidden>·</span>
          <Link href="/app/programme/progress" className="min-h-10 content-center font-semibold text-link hover:underline">
            See your pace
          </Link>
        </p>
      )}
      {open.length > 0 && (
        <p className="text-[13.5px] text-body">
          Choose your {open.map((e) => e.phase).join(' and ')} elective{open.length > 1 ? 's' : ''}
          {open[0]!.deadline ? ` by ${calendarDate(open[0]!.deadline)}` : ''}.{' '}
          <Link href="/app/programme/courses" className="font-semibold text-link hover:underline">
            Choose now
          </Link>
        </p>
      )}
    </section>
  );
}

function NextClass({ p }: { p: MyProgram }) {
  const id = p.enrollment.id;
  const tz = p.cohort.timeZone;
  const next = p.upcomingSessions.find((s) => !s.cancelled) ?? null;
  return (
    <section className="space-y-3" aria-labelledby={`next-class-${id}`}>
      <h3 id={`next-class-${id}`} className={sectionHeading}>
        Next class
      </h3>
      {next ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-ink">{next.title}</p>
            <p className="text-[13px] text-muted">
              {sessionMeta(next, tz)} · {tzLabel(tz)}
            </p>
          </div>
          <SessionAction cohortId={p.cohort.id} s={next} />
        </div>
      ) : (
        <p className="text-[14px] text-muted">No more classes scheduled.</p>
      )}
      <Link href="/app/programme/calendar" className="inline-flex min-h-10 items-center text-[13.5px] font-semibold text-link hover:underline">
        All classes and the calendar
      </Link>
    </section>
  );
}
