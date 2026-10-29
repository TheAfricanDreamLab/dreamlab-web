import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import type { CohortDetail } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { outcomeHref, RESIDENCY_STATUS_LABELS, RESIDENCY_STATUS_TONES, type ResidencyBoard, tenth } from '@/lib/outcomes';

export const metadata: Metadata = { title: 'Residency board' };

type Props = { params: Promise<{ cohortId: string }> };

/** Every learner's seven residency stages at a glance; open a learner to review their work (CAP-1). */
export default async function ResidencyBoardPage({ params }: Props) {
  const { cohortId } = await params;
  if (!isUuid(cohortId)) notFound();
  const [board, cohort] = await Promise.all([
    api<ResidencyBoard>('GET', `/v1/learning/cohorts/${cohortId}/residency`),
    api<CohortDetail>('GET', `/v1/learning/cohorts/${cohortId}`),
  ]);
  if (!board.ok && (board.status === 404 || board.status === 403)) notFound();
  if (!board.ok) return <Notice tone="error">{friendlyError(board.error)}</Notice>;
  const b = board.data;
  const waiting = b.learners.reduce((n, l) => n + l.statuses.filter((s) => s === 'submitted').length, 0);

  return (
    <div className="space-y-8">
      {cohort.ok && <BackLink href={`/app/cohorts/${cohortId}`} label={cohort.data.name} />}
      <header className="space-y-1">
        <Eyebrow tone="gold">{cohort.ok ? cohort.data.programTitle : 'Dream Residency'}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Residency board</h1>
        <p className="text-[14px] text-muted">
          {b.learners.length} {b.learners.length === 1 ? 'learner' : 'learners'} · {waiting} {waiting === 1 ? 'stage' : 'stages'} waiting for review
        </p>
      </header>

      {b.learners.length === 0 ? (
        <Card className="p-6 text-[14.5px] text-muted">Nobody has joined this cohort yet.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-[13.5px]">
            <caption className="sr-only">Residency stages by learner</caption>
            <thead className="border-b border-line">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Learner
                </th>
                {b.stages.map((s) => (
                  <th key={s.position} scope="col" className="px-2 py-3 font-semibold text-ink">
                    <span className="block font-mono text-[10.5px] text-muted">
                      {s.position} · {s.creditHours} cr
                    </span>
                    {s.name}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-right font-semibold text-ink">
                  Credits
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {b.learners.map((l) => (
                <tr key={l.programEnrollmentId}>
                  <th scope="row" className="px-4 py-3 font-semibold">
                    <Link href={`${outcomeHref(l.programEnrollmentId, 'residency')}?cohort=${cohortId}`} className="text-link hover:underline">
                      {l.name}
                    </Link>
                  </th>
                  {l.statuses.map((status, i) => (
                    <td key={i} className="px-2 py-3">
                      <Link href={`${outcomeHref(l.programEnrollmentId, 'residency')}?cohort=${cohortId}&stage=${b.stages[i]?.position ?? i + 1}`} className="inline-block">
                        <Badge tone={RESIDENCY_STATUS_TONES[status]}>{RESIDENCY_STATUS_LABELS[status]}</Badge>
                        <span className="sr-only">
                          {' '}
                          {l.name}, {b.stages[i]?.name}
                        </span>
                      </Link>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-mono">{tenth(l.creditsEarned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
