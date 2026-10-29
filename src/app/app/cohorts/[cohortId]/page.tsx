import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CohortSettingsForm, CohortStatusActions, SessionEditor } from '@/components/cohorts/cohort-forms';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { calendarDate, classTime, COHORT_STATUS_LABELS, COHORT_STATUS_TONES, type CohortDetail, isPast, POLICY_LABELS, type RosterEntry, WEEKDAYS } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { formatScore } from '@/lib/grading';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Cohort' };

type Props = { params: Promise<{ cohortId: string }>; searchParams: Promise<{ created?: string; week?: string }> };

export default async function CohortPage({ params, searchParams }: Props) {
  const [{ cohortId }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(cohortId)) notFound();
  const me = await getMe();
  if (!me.platformAdmin && !(activeMembership(me) && can(me, 'cohort.manage'))) redirect('/app');

  const [res, roster] = await Promise.all([
    api<CohortDetail>('GET', `/v1/learning/cohorts/${cohortId}`),
    api<{ items: RosterEntry[] }>('GET', `/v1/learning/cohorts/${cohortId}/roster`),
  ]);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const c = res.data;
  const tz = c.timeZone;
  const week = Number(sp.week) || c.currentWeek || 1;
  const weekSessions = c.sessions.filter((s) => s.weekNo === week);
  const thisWeek = c.calendar.find((w) => w.weekNo === week);

  return (
    <div className="space-y-8">
      <BackLink href="/app/cohorts" label="All cohorts" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">{c.programTitle}</Eyebrow>
          <h1 className="text-[30px] font-extrabold">{c.name}</h1>
          <p className="text-[14px] text-muted">
            {calendarDate(c.startsOn)} – {calendarDate(c.endsOn)} · {c.hostOrgName} · {tz.replace('_', ' ')} · {POLICY_LABELS[c.enrollmentPolicy]}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={COHORT_STATUS_TONES[c.status]}>{COHORT_STATUS_LABELS[c.status]}</Badge>
          <p className="text-[13px] text-muted">
            {c.learnerCount}
            {c.capacity !== null && ` of ${c.capacity}`} {c.learnerCount === 1 && c.capacity === null ? 'learner' : 'learners'}{c.currentWeek ? ` · week ${c.currentWeek}` : ''}
          </p>
          <span className="flex flex-wrap justify-end gap-x-4">
            <Link href={`/app/cohorts/${c.id}/community`} className="min-h-10 content-center text-[13.5px] font-semibold text-link hover:underline">
              Mentors and Dream Circles
            </Link>
            <Link href={`/app/cohorts/${c.id}/residency`} className="min-h-10 content-center text-[13.5px] font-semibold text-link hover:underline">
              Residency board
            </Link>
            <Link href={`/app/cohorts/${c.id}/graduation`} className="min-h-10 content-center text-[13.5px] font-semibold text-link hover:underline">
              Graduation board
            </Link>
          </span>
        </div>
      </header>

      {sp.created && <Notice tone="success">Scheduled: {c.calendar.length} weeks and {c.sessions.length} classes. Open it for joining when you’re ready.</Notice>}
      {c.status === 'draft' && !sp.created && <Notice tone="neutral">This cohort is a draft: learners can’t see it yet.</Notice>}
      <CohortStatusActions cohort={c} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="space-y-3" aria-labelledby="classes">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="classes" className="text-[19px] font-bold">
                Classes in week {week}
              </h2>
              {thisWeek && (
                <p className="text-[13.5px] text-muted">
                  {thisWeek.phase} · {thisWeek.focus}
                </p>
              )}
            </div>
            <nav aria-label="Weeks" className="flex flex-wrap gap-1">
              {c.calendar.map((w) => (
                <Link
                  key={w.weekNo}
                  href={`/app/cohorts/${c.id}?week=${w.weekNo}`}
                  aria-current={w.weekNo === week ? 'page' : undefined}
                  aria-label={`Week ${w.weekNo}`}
                  className={cx(
                    'grid h-9 min-w-9 place-items-center rounded-full px-2 font-mono text-[12.5px] ring-1',
                    w.weekNo === week ? 'bg-forest text-white ring-forest' : w.weekNo === c.currentWeek ? 'bg-gold-tint text-gold-ink ring-gold-line' : 'text-body ring-line hover:bg-surface',
                  )}
                >
                  {w.weekNo}
                </Link>
              ))}
            </nav>
          </div>
          <Card>
            <ul className="divide-y divide-line">
              {weekSessions.map((s) => (
                <li key={s.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className={cx('block font-semibold', s.cancelled ? 'text-muted line-through' : 'text-ink')}>{s.title}</span>
                      <span className="block text-[13px] text-muted">
                        {classTime(s.startsAt, tz)} · {s.durationMin} min · {s.mode === 'virtual' ? 'Online' : 'In person'}
                        {s.location ? ` · ${s.location}` : ''}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      {s.cancelled && <Badge tone="danger">Cancelled</Badge>}
                      {!s.cancelled && (
                        <Link href={`/app/cohorts/${c.id}/sessions/${s.id}`} className="min-h-10 content-center text-[13.5px] font-semibold text-link hover:underline">
                          {isPast(s) ? 'Attendance' : 'Register'}
                          <span className="sr-only">
                            {' '}
                            for {s.title}, week {s.weekNo}
                          </span>
                        </Link>
                      )}
                    </span>
                  </div>
                  <SessionEditor cohortId={c.id} timeZone={tz} session={s} />
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-[12.5px] text-muted">Weekly rhythm: {c.rhythm.map((r) => `${WEEKDAYS[r.weekday - 1]} ${r.time} (${r.mode === 'virtual' ? 'online' : 'in person'})`).join(' · ')}</p>
        </section>

        <div className="space-y-6">
          <section className="space-y-3" aria-labelledby="roster">
            <h2 id="roster" className="text-[19px] font-bold">
              Learners
            </h2>
            {!roster.ok ? (
              <Notice tone="error">{friendlyError(roster.error)}</Notice>
            ) : roster.data.items.length === 0 ? (
              <Card className="p-5 text-[14px] text-muted">Nobody has joined yet.</Card>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {roster.data.items.map((l) => (
                    <li key={l.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{l.name}</span>
                        <span className="block text-[12.5px] text-muted">Joined {calendarDate(l.enrolledAt.slice(0, 10))}</span>
                      </span>
                      <span className="text-right text-[12.5px] text-muted">
                        <span className="block">Progress {l.progressPct}%</span>
                        <span className="block">Score {l.programmeScore === null ? '—' : formatScore(l.programmeScore)}</span>
                        <span className="block">Attendance {l.attendancePct === null ? '—' : `${l.attendancePct}%`}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="settings">
            <h2 id="settings" className="text-[19px] font-bold">
              Settings
            </h2>
            <Card className="p-5">
              <CohortSettingsForm cohort={c} />
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
