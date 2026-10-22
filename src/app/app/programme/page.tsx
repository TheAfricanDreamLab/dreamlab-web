import type { Metadata } from 'next';
import Link from 'next/link';
import { ElectiveForm } from '@/components/cohorts/cohort-forms';
import { Badge, ButtonLink, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { calendarDate, classTime, type MyProgram } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';

export const metadata: Metadata = { title: 'My programme' };

type Search = { searchParams: Promise<{ joined?: string }> };

export default async function MyProgrammePage({ searchParams }: Search) {
  const { joined } = await searchParams;
  const res = await api<{ items: MyProgram[] }>('GET', '/v1/learning/me/programs');

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
        <dl className="grid gap-3 sm:grid-cols-3">
          <Stat label="This week" value={p.thisWeek?.focus ?? (p.cohort.currentWeek ? '—' : 'Not started')} />
          <Stat label="Major output" value={p.thisWeek?.majorOutput ?? '—'} />
          <Stat label="Attendance" value={attendancePct === null ? 'No classes yet' : `${attendancePct}% (${p.attendance.attended} of ${p.attendance.held})`} />
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
                    {s.location ? (
                      /^https?:\/\//.test(s.location) ? (
                        <a href={s.location} target="_blank" rel="noopener noreferrer" className="text-[13.5px] font-semibold text-link hover:underline">
                          Join class
                        </a>
                      ) : (
                        <span className="text-[13px] text-body">{s.location}</span>
                      )
                    ) : (
                      <span className="text-[12.5px] text-faint">{s.mode === 'virtual' ? 'Link coming' : 'Place coming'}</span>
                    )}
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
                    <span className="font-mono text-[12.5px] text-muted">{c.progressPct}%</span>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-field)] bg-surface px-4 py-3 ring-1 ring-line">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-[14.5px] font-semibold text-ink">{value}</dd>
    </div>
  );
}
