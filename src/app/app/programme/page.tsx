import type { Metadata } from 'next';
import Link from 'next/link';
import { ElectiveForm } from '@/components/cohorts/cohort-forms';
import { LocalTime } from '@/components/community/community-forms';
import { Badge, ButtonLink, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { calendarDate, classTime, type MyProgram } from '@/lib/cohorts';
import { inJoinWindow, meetingRoomHref, MEETING_STATUS_LABELS, type MyCommunity, sessionRoomHref } from '@/lib/community';
import { friendlyError } from '@/lib/errors';
import { formatScore } from '@/lib/grading';
import { api } from '@/lib/gateway';

export const metadata: Metadata = { title: 'My programme' };

type Search = { searchParams: Promise<{ joined?: string }> };

export default async function MyProgrammePage({ searchParams }: Search) {
  const { joined } = await searchParams;
  const [res, community] = await Promise.all([api<{ items: MyProgram[] }>('GET', '/v1/learning/me/programs'), api<MyCommunity>('GET', '/v1/learning/me/community')]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">Your cohort</Eyebrow>
        <h1 className="text-[30px] font-extrabold">My programme</h1>
        <p className="text-[14.5px] text-muted">This week’s focus, your next classes, your courses and what you need to choose.</p>
      </header>

      {!res.ok ? (
        <Notice tone="error">{friendlyError(res.error)}</Notice>
      ) : res.data.items.length === 0 ? (
        <Card className="space-y-4 p-10 text-center">
          <p className="font-display text-[20px] font-bold text-ink">You haven’t joined a cohort yet.</p>
          <p className="text-[14.5px] text-muted">The African Dream Lab runs in cohorts: a class that starts together and meets every week.</p>
          <ButtonLink href="/programs/the-african-dream-lab#cohorts" className="mx-auto sm:px-8">
            See upcoming cohorts
          </ButtonLink>
        </Card>
      ) : (
        res.data.items.map((p) => <Programme key={p.enrollment.id} p={p} justJoined={joined === p.enrollment.id} />)
      )}

      {community.ok ? <Community c={community.data} /> : <Notice tone="error">{friendlyError(community.error)}</Notice>}
    </div>
  );
}

function Programme({ p, justJoined }: { p: MyProgram; justJoined: boolean }) {
  const tz = p.cohort.timeZone;
  const attendancePct = p.attendance.held > 0 ? Math.round((p.attendance.attended / p.attendance.held) * 100) : null;
  const open = p.electives.filter((e) => !e.locked && e.chosen.length === 0);

  return (
    <section className="space-y-6" aria-labelledby={`programme-${p.enrollment.id}`}>
      {justJoined && <Notice tone="success">You’ve joined {p.cohort.name}. Your courses are ready below.</Notice>}
      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold-ink">{p.cohort.programTitle}</p>
            <h2 id={`programme-${p.enrollment.id}`} className="text-[24px] font-bold">
              {p.cohort.name}
            </h2>
            <p className="text-[13.5px] text-muted">
              {calendarDate(p.cohort.startsOn)} – {calendarDate(p.cohort.endsOn)} · Hosted by {p.cohort.hostOrgName} · Class times in {tz.replace('_', ' ')}
            </p>
          </div>
          <Badge tone={p.cohort.currentWeek ? 'gold' : 'neutral'}>
            {p.cohort.currentWeek ? `Week ${p.cohort.currentWeek} of ${p.calendar.length}` : p.cohort.status === 'closed' ? 'Finished' : `Starts ${calendarDate(p.cohort.startsOn)}`}
          </Badge>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="This week" value={p.thisWeek?.focus ?? (p.cohort.currentWeek ? '—' : 'Not started')} />
          <Stat label="Major output" value={p.thisWeek?.majorOutput ?? '—'} />
          <Stat label="Attendance" value={attendancePct === null ? 'No classes yet' : `${attendancePct}% (${p.attendance.attended} of ${p.attendance.held})`} />
          <Stat
            label="Programme Score"
            value={p.score.programmeScore === null ? 'After your first graded course' : `${formatScore(p.score.programmeScore)} · ${formatScore(p.score.scoredCredits)} of ${formatScore(p.score.totalCredits)} credits scored`}
          />
        </dl>
      </Card>

      {open.length > 0 && <Notice tone="info">Choose your {open.map((e) => e.phase).join(' and ')} elective{open.length > 1 ? 's' : ''} below{open[0]!.deadline ? ` by ${calendarDate(open[0]!.deadline)}` : ''}.</Notice>}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3" aria-labelledby={`classes-${p.enrollment.id}`}>
          <h3 id={`classes-${p.enrollment.id}`} className="text-[19px] font-bold">
            Next classes
          </h3>
          {p.upcomingSessions.length === 0 ? (
            <p className="text-[14px] text-muted">No more classes scheduled.</p>
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {p.upcomingSessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{s.title}</span>
                      <span className="block text-[13px] text-muted">
                        {classTime(s.startsAt, tz)} · {s.durationMin} min · {s.mode === 'virtual' ? 'Online' : 'In person'} · Week {s.weekNo}
                      </span>
                    </span>
                    <SessionAction cohortId={p.cohort.id} s={s} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section className="space-y-3" aria-labelledby={`courses-${p.enrollment.id}`}>
          <h3 id={`courses-${p.enrollment.id}`} className="text-[19px] font-bold">
            Your courses
          </h3>
          <Card>
            <ul className="divide-y divide-line">
              {p.courses.map((c) => (
                <li key={c.course.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{c.course.title}</span>
                    <span className="block text-[13px] text-muted">
                      {c.phase}
                      {!c.required && !/elective/i.test(c.phase) && ' · Elective'}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[12.5px] text-muted">{c.score === null ? `${c.progressPct}%` : `Score ${formatScore(c.score)}`}</span>
                    {c.enrollmentId ? (
                      <Link href={`/learn/${c.enrollmentId}`} className="text-[13.5px] font-semibold text-link hover:underline">
                        {c.progressPct > 0 ? 'Continue' : 'Start'}
                        <span className="sr-only"> {c.course.title}</span>
                      </Link>
                    ) : (
                      <span className="text-[12.5px] text-faint">Coming soon</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>

      {p.electives.length > 0 && (
        <section className="space-y-3" aria-labelledby={`electives-${p.enrollment.id}`}>
          <h3 id={`electives-${p.enrollment.id}`} className="text-[19px] font-bold">
            Electives
          </h3>
          {p.electives.map((e) => (
            <Card key={e.phase} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-[16px] font-bold">
                  {e.phase}: choose {e.chooseN === 1 ? 'one' : e.chooseN}
                </h4>
                {e.locked ? <Badge>Choices closed</Badge> : e.deadline ? <Badge tone="gold">Choose by {calendarDate(e.deadline)}</Badge> : null}
              </div>
              <ElectiveForm enrollmentId={p.enrollment.id} choice={e} />
            </Card>
          ))}
        </section>
      )}

      <section className="space-y-3" aria-labelledby={`calendar-${p.enrollment.id}`}>
        <h3 id={`calendar-${p.enrollment.id}`} className="text-[19px] font-bold">
          Calendar
        </h3>
        <Card className="overflow-x-auto">
          <table className="stack-table w-full text-left text-[14px] sm:min-w-[560px] sm:text-[13.5px]">
            <thead className="bg-surface font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Week</th>
                <th scope="col" className="px-4 py-3">Dates</th>
                <th scope="col" className="px-4 py-3">Focus</th>
                <th scope="col" className="px-4 py-3">Major output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {p.calendar.map((w) => (
                <tr key={w.weekNo} aria-current={w.weekNo === p.cohort.currentWeek ? 'date' : undefined} className={cx(w.weekNo === p.cohort.currentWeek && 'bg-gold-tint')}>
                  <td data-label="Week" className="px-4 py-3 font-mono text-ink">{w.weekNo}</td>
                  <td data-label="Dates" className="px-4 py-3 text-muted">{calendarDate(w.startsOn)} – {calendarDate(w.endsOn)}</td>
                  <td className="px-4 py-3 font-medium text-ink">{w.focus}</td>
                  <td className="px-4 py-3 text-body">{w.majorOutput}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </section>
  );
}

/**
 * A class with a link set by faculty joins there; other online classes meet in the Dream Lab room
 * (open from 15 minutes before); in-person classes show their place.
 */
function SessionAction({ cohortId, s }: { cohortId: string; s: MyProgram['upcomingSessions'][number] }) {
  if (s.location && /^https?:\/\//.test(s.location)) {
    return (
      <a href={s.location} target="_blank" rel="noopener noreferrer" className="text-[13.5px] font-semibold text-link hover:underline">
        Join class
      </a>
    );
  }
  if (s.mode === 'virtual') {
    return inJoinWindow(s) ? (
      <Link href={sessionRoomHref(cohortId, s.id)} prefetch={false} className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
        Join class
        <span className="sr-only"> {s.title}</span>
      </Link>
    ) : (
      <span className="text-[12.5px] text-faint">Room opens 15 min before</span>
    );
  }
  return s.location ? <span className="text-[13px] text-body">{s.location}</span> : <span className="text-[12.5px] text-faint">Place coming</span>;
}

/** The learner's people across their cohorts: mentors, upcoming mentor meetings and Dream Circles (COMM-1). */
function Community({ c }: { c: MyCommunity }) {
  if (c.mentors.length === 0 && c.circles.length === 0 && c.meetings.length === 0 && c.recordings.length === 0) return null;
  return (
    <section className="space-y-3" aria-labelledby="my-community">
      <h2 id="my-community" className="text-[22px] font-bold">
        My community
      </h2>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h3 className="text-[17px] font-bold">Mentoring</h3>
          {c.mentors.length === 0 ? (
            <p className="text-[14px] text-muted">You don’t have a mentor yet. Your cohort’s team assigns one.</p>
          ) : (
            <ul className="space-y-1 text-[14px]">
              {c.mentors.map((m) => (
                <li key={`${m.userId}-${m.cohortName}`}>
                  <span className="font-semibold text-ink">{m.name}</span> <span className="text-muted">· your mentor in {m.cohortName}</span>
                </li>
              ))}
            </ul>
          )}
          {c.meetings.length > 0 && (
            <ul className="divide-y divide-line rounded-[var(--radius-field)] ring-1 ring-line" aria-label="Mentor meetings">
              {c.meetings.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">With {m.mentor.name}</span>
                    <span className="block text-[13px] text-muted">
                      <LocalTime iso={m.scheduledAt} /> · {m.durationMin} min · {m.mode === 'virtual' ? 'Online' : (m.location ?? 'In person')}
                      {m.status !== 'scheduled' && ` · ${MEETING_STATUS_LABELS[m.status]}`}
                    </span>
                    {m.status === 'held' && m.notes && <span className="mt-1 block whitespace-pre-line text-[13px] text-body">{m.notes}</span>}
                  </span>
                  {m.joinable && (
                    <Link href={meetingRoomHref(m.id)} prefetch={false} className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white hover:bg-primary-hover">
                      Join meeting
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="space-y-4 p-5">
          <h3 className="text-[17px] font-bold">Dream Circle</h3>
          {c.circles.length === 0 ? (
            <p className="text-[14px] text-muted">You aren’t in a Dream Circle yet. Your cohort’s team forms them.</p>
          ) : (
            c.circles.map((circle) => (
              <div key={circle.id} className="space-y-2">
                <p className="text-[14px]">
                  <span className="font-semibold text-ink">{circle.name}</span> <span className="text-muted">· {circle.cohortName}</span>
                </p>
                <ul className="flex flex-wrap gap-1.5" aria-label={`Members of ${circle.name}`}>
                  {circle.members.map((m) => (
                    <li key={m.userId} className="rounded-full bg-surface px-3 py-1 text-[13px] text-ink ring-1 ring-line">
                      {m.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </Card>
        {c.recordings.length > 0 && (
          <Card className="space-y-3 p-5 xl:col-span-2">
            <h3 className="text-[17px] font-bold">Class recordings</h3>
            <ul className="space-y-1.5" aria-label="Class recordings">
              {c.recordings.map((r) => (
                <li key={r.id}>
                  <a
                    href={`/recordings/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-[var(--radius-field)] bg-surface px-3 py-2 ring-1 ring-line hover:ring-primary"
                  >
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-link">{r.title}</span>
                    <span className="text-[12.5px] text-muted">
                      Week {r.weekNo} · {r.sessionTitle} · {r.cohortName}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-field)] bg-surface px-4 py-3 ring-1 ring-line">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-[14.5px] font-semibold text-ink">{value}</dd>
    </div>
  );
}
