import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ResidencyReviewForm, ResidencyStageForm } from '@/components/outcomes/outcome-forms';
import { OutcomeBack } from '@/components/outcomes/outcome-nav';
import { Badge, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { dateTime, isUuid } from '@/lib/learning';
import { pct, RESIDENCY_STATUS_LABELS, RESIDENCY_STATUS_TONES, type Residency, tenth } from '@/lib/outcomes';

export const metadata: Metadata = { title: 'Dream Residency' };

type Props = { params: Promise<{ enrollmentId: string }>; searchParams: Promise<{ stage?: string; cohort?: string }> };

/**
 * The Dream Residency workspace (CAP-1): seven stages, each with its output document. The learner
 * writes and submits; the cohort's faculty review. The API says which of these the caller may do.
 */
export default async function ResidencyPage({ params, searchParams }: Props) {
  const [{ enrollmentId }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(enrollmentId)) notFound();
  const res = await api<Residency>('GET', `/v1/learning/programs/enrollments/${enrollmentId}/residency`);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const r = res.data;
  const cohortId = sp.cohort && isUuid(sp.cohort) ? sp.cohort : null;
  // Open the stage asked for, else the first one still to finish.
  const asked = Number(sp.stage);
  const stage = r.stages.find((s) => s.position === asked) ?? r.stages.find((s) => s.status !== 'approved') ?? r.stages[0];
  const editable = r.can.edit && stage && ['not_started', 'draft', 'changes_requested'].includes(stage.status);
  const href = (position: number) => `?stage=${position}${cohortId ? `&cohort=${cohortId}` : ''}`;

  return (
    <div className="space-y-8">
      <OutcomeBack enrollmentId={enrollmentId} cohortId={cohortId} board="residency" current="residency" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">{r.cohortName}</Eyebrow>
          <h1 className="text-[30px] font-extrabold">Dream Residency</h1>
          <p className="text-[14px] text-muted">{r.can.edit ? 'Seven stages, each with an output document faculty review and grade.' : `${r.learner.name}’s seven stages and output documents.`}</p>
        </div>
        <p className="text-[14px] text-ink">
          <span className="font-mono text-[22px] font-bold">{tenth(r.creditsEarned)}</span> of {tenth(r.creditsTotal)} credits
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <nav aria-label="Residency stages">
          <ol className="space-y-2">
            {r.stages.map((s) => (
              <li key={s.position}>
                <Link
                  href={href(s.position)}
                  aria-current={s.position === stage?.position ? 'step' : undefined}
                  className={cx(
                    'flex items-center justify-between gap-3 rounded-[var(--radius-field)] px-3 py-2.5 ring-1',
                    s.position === stage?.position ? 'bg-card ring-2 ring-primary' : 'bg-card ring-line hover:ring-line-strong',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] text-muted">
                      Stage {s.position} · {s.creditHours} credits
                    </span>
                    <span className="block font-semibold text-ink">{s.name}</span>
                  </span>
                  <Badge tone={RESIDENCY_STATUS_TONES[s.status]}>{RESIDENCY_STATUS_LABELS[s.status]}</Badge>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        {stage && (
          <section className="space-y-5" aria-labelledby="stage-title">
            <Card className="space-y-2 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold-ink">
                Stage {stage.position} · {stage.outputDocument}
              </p>
              <h2 id="stage-title" className="text-[22px] font-bold">
                {stage.name}
              </h2>
              <p className="text-[14px] text-body">{stage.summary}</p>
            </Card>

            {stage.review && (
              <Notice tone={stage.review.decision === 'approved' ? 'success' : 'info'}>
                <span className="block font-semibold">
                  {stage.review.decision === 'approved' ? `Approved at ${pct(stage.review.scorePct)}` : 'Changes asked'} by {stage.review.reviewer}, {dateTime(stage.review.reviewedAt)}
                </span>
                <span className="mt-1 block whitespace-pre-line">{stage.review.feedback}</span>
              </Notice>
            )}

            {editable ? (
              <Card className="p-5">
                <ResidencyStageForm enrollmentId={enrollmentId} stage={stage} />
              </Card>
            ) : (
              <Card className="space-y-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[17px] font-bold">{stage.outputDocument}</h3>
                  {stage.submittedAt && <span className="text-[13px] text-muted">Submitted {dateTime(stage.submittedAt)}</span>}
                </div>
                {stage.document.text ? (
                  <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-body">{stage.document.text}</p>
                ) : (
                  <p className="text-[14px] text-muted">Nothing written yet.</p>
                )}
                {stage.document.links.length > 0 && (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
                    {stage.document.links.map((l) => (
                      <li key={l.url}>
                        <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-link hover:underline">
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {r.can.edit && stage.status === 'submitted' && <p className="text-[13.5px] text-muted">With faculty for review. You can edit it again if they ask for changes.</p>}
              </Card>
            )}

            {r.can.review && stage.status === 'submitted' && (
              <Card className="space-y-3 p-5">
                <h3 className="text-[17px] font-bold">Review this stage</h3>
                <ResidencyReviewForm enrollmentId={enrollmentId} stage={stage} />
              </Card>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
