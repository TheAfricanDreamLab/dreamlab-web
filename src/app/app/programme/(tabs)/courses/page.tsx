import type { Metadata } from 'next';
import Link from 'next/link';
import { ElectiveForm } from '@/components/cohorts/cohort-forms';
import { CountUp } from '@/components/ui/motion';
import { Badge, Notice } from '@/components/ui/primitives';
import { calendarDate, type MyProgram } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { formatScore } from '@/lib/grading';
import { loadProgrammes } from '../../_components/data';
import { Bar, NoProgramme, ProgrammeHeading, sectionHeading } from '../../_components/parts';

export const metadata: Metadata = { title: 'Programme courses' };

/** The programme's courses with progress, and the electives still to choose. */
export default async function ProgrammeCoursesPage() {
  const res = await loadProgrammes();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  if (res.data.items.length === 0) return <NoProgramme />;
  return (
    <div className="space-y-16">
      {res.data.items.map((p) => (
        <Courses key={p.enrollment.id} p={p} />
      ))}
    </div>
  );
}

function Courses({ p }: { p: MyProgram }) {
  const id = p.enrollment.id;
  return (
    <section className="space-y-8" aria-labelledby={`programme-${id}`}>
      <ProgrammeHeading p={p} />

      <section className="space-y-3" aria-labelledby={`courses-${id}`}>
        <h3 id={`courses-${id}`} className={sectionHeading}>
          Your courses
        </h3>
        <ul className="dl-stagger divide-y divide-line border-y border-line">
          {p.courses.map((c) => (
            <li key={c.course.id} className="space-y-2 py-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug text-ink">{c.course.title}</p>
                  <p className="text-[13px] text-muted">
                    {c.phase}
                    {!c.required && !/elective/i.test(c.phase) && ' · Elective'}
                    {c.score !== null && ` · Score ${formatScore(c.score)}`}
                  </p>
                </div>
                {c.enrollmentId ? (
                  <Link
                    href={`/learn/${c.enrollmentId}`}
                    className="dl-press inline-flex min-h-10 items-center rounded-full px-4 text-[13.5px] font-semibold text-link ring-1 ring-line-strong hover:ring-line-heavy"
                  >
                    {c.progressPct >= 100 ? 'Review' : c.progressPct > 0 ? 'Continue' : 'Start'}
                    <span className="sr-only"> {c.course.title}</span>
                  </Link>
                ) : (
                  <span className="min-h-10 content-center text-[12.5px] text-faint">Coming soon</span>
                )}
              </div>
              {c.enrollmentId && (
                <div className="flex items-center gap-3">
                  <Bar pct={c.progressPct} label={`Progress in ${c.course.title}`} className="flex-1" />
                  <span className="w-10 shrink-0 text-right font-mono text-[12px] text-muted">
                    <CountUp value={c.progressPct} />%
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {p.electives.length > 0 && (
        <section className="space-y-4" aria-labelledby={`electives-${id}`}>
          <h3 id={`electives-${id}`} className={sectionHeading}>
            Electives
          </h3>
          {p.electives.map((e) => (
            <div key={e.phase} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-[16px] font-bold">
                  {e.phase}: choose {e.chooseN === 1 ? 'one' : e.chooseN}
                </h4>
                {e.locked ? <Badge>Choices closed</Badge> : e.deadline ? <Badge tone="gold">Choose by {calendarDate(e.deadline)}</Badge> : null}
              </div>
              <ElectiveForm enrollmentId={id} choice={e} />
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
