import { BUILDER_ASSESSMENT_PROMPTS } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AllAnswers, StatusBadge, Timeline } from '@/components/admissions/application-views';
import { AdvanceForm, AiEvaluationForm, DecisionForm, InterviewForm, ReviewForm, ScholarshipForm } from '@/components/admissions/staff-forms';
import { BackLink } from '@/components/ui/nav';
import { Card, Eyebrow, Notice } from '@/components/ui/primitives';
import {
  type Application,
  admissionsTime,
  DIMENSION_LABELS,
  DIMENSIONS,
  type DimensionScores,
  formatIndex,
  RECOMMENDATION_LABELS,
  STAGE_LABELS,
  STAGES,
} from '@/lib/admissions';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Application' };

type Props = { params: Promise<{ applicationId: string }> };

/** Staff stages that move on with "advance" (the applicant's stages move on when they submit). */
const ADVANCES_FROM = new Set(['interview', 'scholarship', 'committee']);

function Scores({ scores, dbpi, dsi }: { scores: DimensionScores; dbpi: number | null; dsi: number | null }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[12px] text-muted">
        DBPI {formatIndex(dbpi)} · DSI {formatIndex(dsi)}
      </p>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {DIMENSIONS.map((d) => (
          <div key={d} className="flex justify-between gap-3 text-[13.5px]">
            <dt className="text-muted">{DIMENSION_LABELS[d]}</dt>
            <dd className="font-mono font-semibold text-ink">{scores[d] ?? '—'}/5</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function StaffApplicationPage({ params }: Props) {
  const { applicationId } = await params;
  if (!isUuid(applicationId)) notFound();
  const me = await getMe();
  if (!me.platformAdmin && !(activeMembership(me) && can(me, 'admissions.review'))) redirect(`/app/apply/${applicationId}`);
  const res = await api<Application>('GET', `/v1/admissions/applications/${applicationId}`);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const a = res.data;
  const open = a.status === 'under_review' || a.status === 'waitlisted';
  const next = STAGES[STAGES.indexOf(a.stage) + 1];
  const canAdvance = a.can.review && a.status === 'under_review' && ADVANCES_FROM.has(a.stage) && next;
  const canAward = can(me, 'admissions.decide') && open && ['scholarship', 'committee', 'decision'].includes(a.stage);

  return (
    <div className="space-y-8">
      <BackLink href={`/app/admissions/cycles/${a.cycle.id}`} label={a.cycle.name} />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">
            {a.cycle.programTitle} · {STAGE_LABELS[a.stage]}
          </Eyebrow>
          <h1 className="text-[30px] font-extrabold">{a.applicant.name}</h1>
          <p className="text-[14px] text-muted">
            Applied {admissionsTime(a.createdAt)} · last change {admissionsTime(a.updatedAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={a.status} />
          <p className="font-mono text-[12px] text-muted">
            DBPI {formatIndex(a.dbpi)} · DSI {formatIndex(a.dsi)}
          </p>
        </div>
      </header>

      {a.status === 'in_progress' && <Notice tone="neutral">The applicant is still completing their stages. You can review once they submit the last one.</Notice>}
      {a.decision && (
        <Notice tone={a.decision.outcome === 'admitted' ? 'success' : 'neutral'}>
          {a.decision.outcome === 'admitted' ? 'Admitted' : a.decision.outcome === 'waitlisted' ? 'Waitlisted' : 'Declined'} by {a.decision.decidedBy} on {admissionsTime(a.decision.decidedAt)}: {a.decision.note}
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="space-y-3" aria-labelledby="answers">
            <h2 id="answers" className="text-[19px] font-bold">
              Answers
            </h2>
            <AllAnswers application={a} prompts={BUILDER_ASSESSMENT_PROMPTS} />
          </section>

          <section className="space-y-3" aria-labelledby="reviews">
            <h2 id="reviews" className="text-[19px] font-bold">
              Reviews
            </h2>
            {a.reviews.length === 0 ? (
              <Card className="p-5 text-[14px] text-muted">No reviews yet.</Card>
            ) : (
              a.reviews.map((r) => (
                <Card key={r.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-ink">
                      {r.reviewer} · recommends {RECOMMENDATION_LABELS[r.recommendation].toLowerCase()}
                    </p>
                    <p className="text-[12.5px] text-muted">
                      {STAGE_LABELS[r.stage]} · {admissionsTime(r.createdAt)}
                    </p>
                  </div>
                  <Scores scores={r.scores} dbpi={r.dbpi} dsi={r.dsi} />
                  <p className="whitespace-pre-line text-[14px] text-body">{r.comment}</p>
                </Card>
              ))
            )}
          </section>

          <section className="space-y-3" aria-labelledby="ai">
            <div className="space-y-1">
              <h2 id="ai" className="text-[19px] font-bold">
                AI-assisted evaluations
              </h2>
              <p className="text-[13px] text-muted">AI-assisted: it informs reviewers; decisions are human. Each evaluation is kept as it was given, with the model and prompt version that gave it.</p>
            </div>
            {a.aiEvaluations.map((e) => (
              <Card key={e.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-[12px] text-muted">
                    {e.model} · prompt {e.promptVersion}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    Asked by {e.requestedBy} · {admissionsTime(e.createdAt)}
                  </p>
                </div>
                <Scores scores={e.scores} dbpi={e.dbpi} dsi={e.dsi} />
                <p className="whitespace-pre-line text-[14px] text-body">{e.rationale}</p>
              </Card>
            ))}
            {a.can.review ? (
              <Card className="p-5">
                <AiEvaluationForm applicationId={a.id} />
              </Card>
            ) : (
              a.aiEvaluations.length === 0 && <Card className="p-5 text-[14px] text-muted">No AI evaluations.</Card>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {canAdvance && (
            <section className="space-y-3" aria-labelledby="advance">
              <h2 id="advance" className="text-[19px] font-bold">
                Next stage
              </h2>
              <Card className="p-5">
                <AdvanceForm applicationId={a.id} nextLabel={STAGE_LABELS[next]} />
              </Card>
            </section>
          )}

          {(a.interview || (a.can.review && a.stage === 'interview')) && (
            <section className="space-y-3" aria-labelledby="interview">
              <h2 id="interview" className="text-[19px] font-bold">
                Interview
              </h2>
              <Card className="space-y-3 p-5">
                {a.can.review && a.stage === 'interview' && a.status === 'under_review' ? (
                  <InterviewForm applicationId={a.id} interview={a.interview} />
                ) : (
                  a.interview && (
                    <>
                      <p className="text-[14px] font-semibold text-ink">{admissionsTime(a.interview.scheduledAt)}, Lagos time</p>
                      {a.interview.notes && <p className="whitespace-pre-line text-[14px] text-body">{a.interview.notes}</p>}
                    </>
                  )
                )}
              </Card>
            </section>
          )}

          {(a.scholarship || canAward) && (
            <section className="space-y-3" aria-labelledby="scholarship">
              <h2 id="scholarship" className="text-[19px] font-bold">
                Scholarship
              </h2>
              <Card className="space-y-3 p-5">
                {a.scholarship && (
                  <p className="text-[14px] text-body">
                    <span className="font-semibold text-ink">{a.scholarship.percent}%</span> · {a.scholarship.decidedBy}, {admissionsTime(a.scholarship.decidedAt)}
                    {a.scholarship.note ? `: ${a.scholarship.note}` : ''}
                  </p>
                )}
                {canAward && <ScholarshipForm applicationId={a.id} current={a.scholarship} />}
              </Card>
            </section>
          )}

          {a.can.decide && (
            <section className="space-y-3" aria-labelledby="decision">
              <h2 id="decision" className="text-[19px] font-bold">
                Decision
              </h2>
              <Card className="p-5">
                <DecisionForm applicationId={a.id} />
              </Card>
            </section>
          )}

          {a.can.review && (
            <section className="space-y-3" aria-labelledby="review">
              <h2 id="review" className="text-[19px] font-bold">
                Your review
              </h2>
              <Card className="p-5">
                <ReviewForm applicationId={a.id} />
              </Card>
            </section>
          )}

          <section className="space-y-3" aria-labelledby="history">
            <h2 id="history" className="text-[19px] font-bold">
              History
            </h2>
            <Card className="p-5">
              <Timeline application={a} />
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
