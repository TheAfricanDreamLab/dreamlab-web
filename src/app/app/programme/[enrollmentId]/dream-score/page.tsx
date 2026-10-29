import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DreamScoreBars, DreamScoreGrowth, DreamScoreRadar } from '@/components/outcomes/dream-score-charts';
import { OutcomeBack } from '@/components/outcomes/outcome-nav';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { dateTime, isUuid } from '@/lib/learning';
import { type DreamScore, tenth } from '@/lib/outcomes';

export const metadata: Metadata = { title: 'Dream Score' };

type Props = { params: Promise<{ enrollmentId: string }>; searchParams: Promise<{ cohort?: string }> };

const SOURCE_LABELS: Record<DreamScore['recent'][number]['source'], string> = {
  course_grade: 'Course',
  residency_stage: 'Residency',
  mentor_meeting: 'Mentoring',
  attendance: 'Attendance',
};

/**
 * The Dream Score™ (SCORE-1): ten competency dimensions from 0 to 10, grown week by week from graded
 * work, the residency, mentoring and attendance. It informs; it never decides graduation.
 */
export default async function DreamScorePage({ params, searchParams }: Props) {
  const [{ enrollmentId }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(enrollmentId)) notFound();
  const res = await api<DreamScore>('GET', `/v1/learning/programs/enrollments/${enrollmentId}/dream-score`);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const s = res.data;
  const cohortId = sp.cohort && isUuid(sp.cohort) ? sp.cohort : null;
  const labels = new Map(s.dimensions.map((d) => [d.key, d.label]));

  return (
    <div className="space-y-8">
      <OutcomeBack enrollmentId={enrollmentId} cohortId={cohortId} board="graduation" current="dream-score" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">Dream Score™</Eyebrow>
          <h1 className="text-[30px] font-extrabold">Competencies</h1>
          <p className="max-w-2xl text-[14px] text-muted">
            Ten dimensions, each from 0 to 10, built from graded work, residency stages, mentor meetings and attendance. It shows where growth is happening; it never decides
            graduation.
          </p>
        </div>
        <p className="text-right">
          <span className="font-mono text-[34px] font-bold text-ink">{tenth(s.overall)}</span>
          <span className="block text-[13px] text-muted">of 10</span>
        </p>
      </header>

      {s.overall === null && <Notice tone="info">The Dream Score appears with the first graded course, residency stage, mentor meeting or class.</Notice>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="space-y-4 p-5">
          <h2 className="text-[19px] font-bold">By dimension</h2>
          {/* The radar needs room; small screens get the same dimensions as a ranked list. */}
          <div className="hidden justify-center md:flex">
            <DreamScoreRadar dimensions={s.dimensions} />
          </div>
          <DreamScoreBars dimensions={s.dimensions} className="md:hidden" />
        </Card>
        <div className="space-y-6">
          <Card className="space-y-3 p-5">
            <h2 className="text-[19px] font-bold">Growth by week</h2>
            <DreamScoreGrowth growth={s.growth} />
          </Card>
          <Card className="space-y-3 p-5">
            <h2 className="text-[19px] font-bold">What moved it</h2>
            {s.recent.length === 0 ? (
              <p className="text-[14px] text-muted">Nothing yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {s.recent.map((e, i) => (
                  <li key={`${e.at}-${e.dimension}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-[14px] text-ink">{e.label}</span>
                      <span className="block text-[12.5px] text-muted">
                        {SOURCE_LABELS[e.source]} · {labels.get(e.dimension) ?? e.dimension} · {dateTime(e.at)}
                      </span>
                    </span>
                    <span className="font-mono text-[13.5px] text-ink">{tenth(e.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
