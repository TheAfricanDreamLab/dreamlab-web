import type { ReactNode } from 'react';
import { ButtonLink, cx } from '@/components/ui/primitives';
import { classTime, type MyProgram } from '@/lib/cohorts';
import { inJoinWindow } from '@/lib/community';
import { RoomLink } from './room-link';

/*
 * Small pieces the My programme pages share. Quiet by default: type and space over boxes, one green
 * button per screen for the thing to do next.
 */

export type Session = MyProgram['upcomingSessions'][number];

/** A section heading inside a programme: small, so the content leads. */
export const sectionHeading = 'text-[13px] font-semibold uppercase tracking-[0.08em] text-muted';

/** "Lagos time", from "Africa/Lagos". */
export const tzLabel = (tz: string) => `${(tz.split('/').pop() ?? tz).replace(/_/g, ' ')} time`;

/** The way into a cohort for someone who hasn't joined one. */
export function NoProgramme() {
  return (
    <div className="dl-fade space-y-4 py-10 text-center">
      <p className="font-display text-[20px] font-bold text-ink">You haven’t joined a cohort yet.</p>
      <p className="mx-auto max-w-md text-[14.5px] text-muted">The African Dream Lab runs in cohorts: a class that starts together and meets every week.</p>
      <ButtonLink href="/programs/the-african-dream-lab#cohorts" className="dl-press mx-auto sm:px-8">
        See upcoming cohorts
      </ButtonLink>
    </div>
  );
}

/** One programme's name on a sub-page: the programme in small capitals, the cohort as the heading. */
export function ProgrammeHeading({ p, children }: { p: MyProgram; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id={`programme-${p.enrollment.id}`} className="min-w-0 text-[19px] font-bold leading-snug">
        <span className="block font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-gold-ink">{p.cohort.programTitle}</span>
        {p.cohort.name}
      </h2>
      {children}
    </div>
  );
}

/** A slim progress bar that grows in from the left. */
export function Bar({ pct, label, tone = 'primary', className }: { pct: number; label: string; tone?: 'primary' | 'gold'; className?: string }) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-line', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
      <div className={cx('dl-bar h-full rounded-full', tone === 'gold' ? 'bg-gold' : 'bg-primary')} style={{ width: `${value}%` }} />
    </div>
  );
}

/** "Tue 3 Nov, 21:00 · 90 min · Online". */
export function sessionMeta(s: Session, tz: string) {
  return `${classTime(s.startsAt, tz)} · ${s.durationMin} min · ${s.mode === 'virtual' ? 'Online' : 'In person'}`;
}

/**
 * A class with a link set by faculty joins there; other online classes meet in the Dream Lab room
 * (open from 15 minutes before); in-person classes show their place.
 */
export function SessionAction({ cohortId, s }: { cohortId: string; s: Session }) {
  const join = 'dl-press inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover';
  if (s.cancelled) return <span className="text-[12.5px] text-faint">Cancelled</span>;
  if (s.location && /^https?:\/\//.test(s.location)) {
    return (
      <a href={s.location} target="_blank" rel="noopener noreferrer" className={join}>
        Join class
      </a>
    );
  }
  if (s.mode === 'virtual') {
    // A small client piece, so "Join class" appears when the room opens without a reload.
    // A server component renders once per request, so reading the clock here is safe: it is the server's time.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return (
      <RoomLink
        cohortId={cohortId}
        s={{ id: s.id, title: s.title, startsAt: s.startsAt, durationMin: s.durationMin, mode: s.mode, cancelled: s.cancelled }}
        open={inJoinWindow(s, now)}
        serverNow={now}
        className={join}
      />
    );
  }
  return s.location ? <span className="text-[13px] text-body">{s.location}</span> : <span className="text-[12.5px] text-faint">Place coming</span>;
}
