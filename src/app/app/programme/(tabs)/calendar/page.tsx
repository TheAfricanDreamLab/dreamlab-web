import type { Metadata } from 'next';
import { LoadNote } from '@/components/app/dashboard';
import { Card, cx, Notice } from '@/components/ui/primitives';
import { calendarDate, type MyProgram } from '@/lib/cohorts';
import type { MyCommunity } from '@/lib/community';
import { friendlyError } from '@/lib/errors';
import { loadCommunity, loadProgrammes } from '../../_components/data';
import { NoProgramme, ProgrammeHeading, sectionHeading, SessionAction, sessionMeta, tzLabel } from '../../_components/parts';

export const metadata: Metadata = { title: 'Programme calendar' };

/** The programme week by week, every class still to come, and recordings of the ones held. */
export default async function ProgrammeCalendarPage() {
  const [res, community] = await Promise.all([loadProgrammes(), loadCommunity()]);
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  if (res.data.items.length === 0) return <NoProgramme />;
  return (
    <div className="space-y-16">
      {res.data.items.map((p) => (
        <Calendar key={p.enrollment.id} p={p} />
      ))}
      {community.ok ? (
        <Recordings recordings={community.data.recordings} />
      ) : (
        <LoadNote retry="/app/programme/calendar">We couldn’t load your class recordings just now.</LoadNote>
      )}
    </div>
  );
}

function Calendar({ p }: { p: MyProgram }) {
  const id = p.enrollment.id;
  const tz = p.cohort.timeZone;
  return (
    <section className="space-y-8" aria-labelledby={`programme-${id}`}>
      <ProgrammeHeading p={p}>
        <span className="text-[13px] text-muted">
          {calendarDate(p.cohort.startsOn)} – {calendarDate(p.cohort.endsOn)} · Hosted by {p.cohort.hostOrgName}
        </span>
      </ProgrammeHeading>

      <section className="space-y-3" aria-labelledby={`classes-${id}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={`classes-${id}`} className={sectionHeading}>
            Upcoming classes
          </h3>
          <span className="text-[12.5px] text-muted">Times in {tzLabel(tz)}</span>
        </div>
        {p.upcomingSessions.length === 0 ? (
          <p className="text-[14px] text-muted">No more classes scheduled.</p>
        ) : (
          <ul className="dl-stagger divide-y divide-line border-y border-line">
            {p.upcomingSessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className={cx('block font-semibold', s.cancelled ? 'text-muted line-through decoration-line-heavy' : 'text-ink')}>{s.title}</span>
                  <span className="block text-[13px] text-muted">
                    {sessionMeta(s, tz)} · Week {s.weekNo}
                  </span>
                </span>
                <SessionAction cohortId={p.cohort.id} s={s} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby={`calendar-${id}`}>
        <h3 id={`calendar-${id}`} className={sectionHeading}>
          Week by week
        </h3>
        <Card className="overflow-x-auto shadow-none">
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
                <tr
                  key={w.weekNo}
                  aria-current={w.weekNo === p.cohort.currentWeek ? 'date' : undefined}
                  data-week-kind={w.kind ?? 'learning'}
                  className={cx(w.weekNo === p.cohort.currentWeek ? 'bg-gold-tint' : w.kind === 'catch_up' && 'bg-sky-tint')}
                >
                  <td data-label="Week" className="px-4 py-3 font-mono text-ink">
                    {w.weekNo}
                    {w.weekNo === p.cohort.currentWeek && <span className="ml-2 font-sans text-[12px] font-semibold text-gold-ink">This week</span>}
                  </td>
                  <td data-label="Dates" className="px-4 py-3 text-muted">
                    {calendarDate(w.startsOn)} – {calendarDate(w.endsOn)}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {w.kind === 'catch_up' && (
                      <span className="mb-1 mr-2 inline-flex items-center rounded-full bg-sky-tint px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-sky-ink ring-1 ring-sky-line">
                        Catch-up week
                      </span>
                    )}
                    {w.focus}
                  </td>
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

/** Recordings of the learner's cohorts' classes, newest first (COMM-1). */
function Recordings({ recordings }: { recordings: MyCommunity['recordings'] }) {
  if (recordings.length === 0) return null;
  return (
    <section className="space-y-3" aria-labelledby="class-recordings">
      <h2 id="class-recordings" className="text-[19px] font-bold">
        Class recordings
      </h2>
      <ul className="space-y-2" aria-label="Class recordings">
        {recordings.map((r) => (
          <li key={r.id}>
            <a
              href={`/recordings/${r.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="dl-lift flex min-h-11 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-[var(--radius-field)] bg-card px-3 py-2 ring-1 ring-line hover:ring-primary"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-link">{r.title}</span>
              <span className="text-[12.5px] text-muted">
                Week {r.weekNo} · {r.sessionTitle} · {r.cohortName}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
