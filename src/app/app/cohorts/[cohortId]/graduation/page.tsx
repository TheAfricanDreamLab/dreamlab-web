import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { calendarDate, type CohortDetail } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { type GraduationBoard, outcomeHref, tenth } from '@/lib/outcomes';

export const metadata: Metadata = { title: 'Graduation board' };

type Props = { params: Promise<{ cohortId: string }> };

/** The cohort's graduation review: confirmed requirements, evidence and credits per learner (GRAD-1). */
export default async function GraduationBoardPage({ params }: Props) {
  const { cohortId } = await params;
  if (!isUuid(cohortId)) notFound();
  const [board, cohort] = await Promise.all([
    api<GraduationBoard>('GET', `/v1/learning/cohorts/${cohortId}/graduation`),
    api<CohortDetail>('GET', `/v1/learning/cohorts/${cohortId}`),
  ]);
  if (!board.ok && (board.status === 404 || board.status === 403)) notFound();
  if (!board.ok) return <Notice tone="error">{friendlyError(board.error)}</Notice>;
  const b = board.data;
  const total = b.requirements.length;
  const graduated = b.learners.filter((l) => l.graduatedAt).length;

  return (
    <div className="space-y-8">
      {cohort.ok && <BackLink href={`/app/cohorts/${cohortId}`} label={cohort.data.name} />}
      <header className="space-y-1">
        <Eyebrow tone="gold">{cohort.ok ? cohort.data.programTitle : 'Graduation'}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Graduation board</h1>
        <p className="text-[14px] text-muted">
          {total} requirements, each confirmed by faculty · {graduated} of {b.learners.length} graduated
        </p>
      </header>

      {b.learners.length === 0 ? (
        <Card className="p-6 text-[14.5px] text-muted">Nobody has joined this cohort yet.</Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {b.learners.map((l) => (
              <li key={l.programEnrollmentId}>
                <Link href={`${outcomeHref(l.programEnrollmentId, 'graduation')}?cohort=${cohortId}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{l.name}</span>
                    <span className="block text-[13px] text-muted">
                      Evidence met for {l.evidenceMet} of {total} · {tenth(l.creditsEarned)} credits
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[14px] text-ink">
                      {l.confirmed}/{total}
                      <span className="sr-only"> confirmed</span>
                    </span>
                    {l.graduatedAt ? <Badge tone="green">Graduated {calendarDate(l.graduatedAt.slice(0, 10))}</Badge> : l.confirmed === total ? <Badge tone="gold">Ready</Badge> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
