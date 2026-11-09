import type { Metadata } from 'next';
import Link from 'next/link';
import { CertificatePath, OnTrackCard } from '@/components/engagement/on-track';
import { CountUp } from '@/components/ui/motion';
import { Notice } from '@/components/ui/primitives';
import type { MyProgram } from '@/lib/cohorts';
import type { ProgramOnTrack } from '@/lib/engagement';
import { friendlyError } from '@/lib/errors';
import { formatScore } from '@/lib/grading';
import { outcomeHref } from '@/lib/outcomes';
import { loadProgrammes, loadTracks } from '../../_components/data';
import { NoProgramme, ProgrammeHeading, sectionHeading } from '../../_components/parts';

export const metadata: Metadata = { title: 'Programme progress' };

const OUTCOME_LINKS = [
  { page: 'residency', label: 'Dream Residency', hint: 'Seven stages and their outputs' },
  { page: 'action-plan', label: 'Action plan', hint: 'Your 12 months after the Lab' },
  { page: 'dream-score', label: 'Dream Score', hint: 'Ten competencies, built from your work' },
  { page: 'portfolio', label: 'Portfolio', hint: 'Your work, ready to share' },
  { page: 'graduation', label: 'Graduation', hint: 'Where you stand' },
] as const;

/** Pace in full with the catch-up plan, the Programme Score, attendance, the way to the certificate and the outcome pages. */
export default async function ProgrammeProgressPage() {
  const res = await loadProgrammes();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const items = res.data.items;
  if (items.length === 0) return <NoProgramme />;
  const tracks = await loadTracks(items);
  return (
    <div className="space-y-16">
      {items.map((p, i) => (
        <Progress key={p.enrollment.id} p={p} track={tracks[i] ?? null} />
      ))}
    </div>
  );
}

function Progress({ p, track }: { p: MyProgram; track: ProgramOnTrack | null }) {
  const id = p.enrollment.id;
  const attendancePct = p.attendance.held > 0 ? Math.round((p.attendance.attended / p.attendance.held) * 100) : null;
  const score = p.score.programmeScore;

  return (
    <section className="space-y-8" aria-labelledby={`programme-${id}`}>
      <ProgrammeHeading p={p} />

      <div className="dl-stagger space-y-10">
        {track && <OnTrackCard data={track} name={p.cohort.name} />}

        <section aria-labelledby={`figures-${id}`} className="space-y-3">
          <h3 id={`figures-${id}`} className={sectionHeading}>
            Score and attendance
          </h3>
          <dl className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <dt className="text-[13px] text-muted">Programme Score</dt>
              <dd className="font-display text-[30px] font-extrabold leading-none text-ink">{score === null ? '—' : <CountUp value={score} format={formatScore} />}</dd>
              <dd className="text-[12.5px] text-muted">
                {score === null ? 'After your first graded course' : `${formatScore(p.score.scoredCredits)} of ${formatScore(p.score.totalCredits)} credits scored`}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-[13px] text-muted">Attendance</dt>
              <dd className="font-display text-[30px] font-extrabold leading-none text-ink">
                {attendancePct === null ? (
                  '—'
                ) : (
                  <>
                    <CountUp value={attendancePct} />%
                  </>
                )}
              </dd>
              <dd className="text-[12.5px] text-muted">{attendancePct === null ? 'No classes yet' : `${p.attendance.attended} of ${p.attendance.held} classes`}</dd>
            </div>
          </dl>
        </section>

        {track && <CertificatePath certificate={track.certificate} name={p.cohort.programTitle} />}

        <nav aria-label={`Outcomes for ${p.cohort.name}`} className="space-y-3">
          <h3 className={sectionHeading}>Your outcomes</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {OUTCOME_LINKS.map((o) => (
              <li key={o.page}>
                <Link href={outcomeHref(id, o.page)} className="dl-lift flex min-h-14 flex-col justify-center rounded-[var(--radius-field)] bg-card px-4 py-2.5 ring-1 ring-line hover:ring-primary">
                  <span className="text-[14.5px] font-semibold text-link">{o.label}</span>
                  <span className="text-[12.5px] text-muted">{o.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
