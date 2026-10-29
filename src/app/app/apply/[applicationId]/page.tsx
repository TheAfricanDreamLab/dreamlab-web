import { BUILDER_ASSESSMENT_PROMPTS } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StageForm, WithdrawForm } from '@/components/admissions/application-forms';
import { AllAnswers, StatusBadge, Timeline } from '@/components/admissions/application-views';
import { BackLink } from '@/components/ui/nav';
import { Card, Eyebrow, Notice, Steps } from '@/components/ui/primitives';
import { type Application, admissionsTime, APPLICANT_STAGES, isApplicantStage, STAGE_INTROS, STAGE_LABELS } from '@/lib/admissions';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { isUuid } from '@/lib/learning';

export const metadata: Metadata = { title: 'My application' };

type Props = { params: Promise<{ applicationId: string }> };

const OUTCOME_MESSAGES: Record<'admitted' | 'waitlisted' | 'declined', string> = {
  admitted: 'Congratulations: you have a place. Your cohort appears in My programme once it is ready.',
  waitlisted: 'You’re on the waitlist. We’ll tell you as soon as a place opens.',
  declined: 'We’re unable to offer you a place in this cycle. Thank you for applying.',
};

export default async function ApplicationPage({ params }: Props) {
  const { applicationId } = await params;
  if (!isUuid(applicationId)) notFound();
  const res = await api<Application>('GET', `/v1/admissions/applications/${applicationId}`);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const a = res.data;
  const stage = a.stage;
  const filling = a.status === 'in_progress' && isApplicantStage(stage);
  const step = filling ? APPLICANT_STAGES.indexOf(stage) + 1 : APPLICANT_STAGES.length + 1;
  const canWithdraw = ['in_progress', 'under_review', 'waitlisted'].includes(a.status);

  return (
    <div className="space-y-8">
      <BackLink href="/app/apply" label="All applications" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">{a.cycle.orgName}</Eyebrow>
          <h1 className="text-[30px] font-extrabold">{a.cycle.programTitle}</h1>
          <p className="text-[14px] text-muted">
            {a.cycle.name} · applications close {admissionsTime(a.cycle.closesAt)}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </header>

      {a.decision && <Notice tone={a.decision.outcome === 'admitted' ? 'success' : 'neutral'}>{OUTCOME_MESSAGES[a.decision.outcome]}</Notice>}
      {a.scholarship && a.scholarship.percent > 0 && <Notice tone="success">You have been awarded a {a.scholarship.percent}% scholarship.</Notice>}
      {a.status === 'under_review' && (
        <Notice tone="info">Your application is complete and with the admissions team. We’ll tell you as it moves on; you don’t need to do anything now.</Notice>
      )}
      {a.status === 'withdrawn' && <Notice tone="neutral">You withdrew this application.</Notice>}

      {filling && (
        <section className="space-y-4" aria-labelledby="stage-title">
          <Steps total={APPLICANT_STAGES.length} current={step} labels={APPLICANT_STAGES.map((s) => STAGE_LABELS[s])} />
          <Card className="space-y-5 p-5 sm:p-6">
            <div className="space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold-ink">
                Step {step} of {APPLICANT_STAGES.length}
              </p>
              <h2 id="stage-title" className="text-[22px] font-bold">
                {STAGE_LABELS[stage]}
              </h2>
              <p className="text-[14px] text-muted">{STAGE_INTROS[stage]}</p>
            </div>
            {a.can.edit ? (
              <StageForm key={stage} applicationId={a.id} stage={stage} answers={a.answers[stage] ?? {}} prompts={BUILDER_ASSESSMENT_PROMPTS} />
            ) : (
              <Notice tone="neutral">This cycle isn’t taking applications any more, so this application can’t be finished.</Notice>
            )}
          </Card>
        </section>
      )}

      {a.interview && (
        <Card className="space-y-1 p-5">
          <h2 className="text-[19px] font-bold">Interview</h2>
          <p className="text-[14.5px] text-ink">
            {admissionsTime(a.interview.scheduledAt)}, Lagos time{a.interview.interviewer ? `, with ${a.interview.interviewer}` : ''}
          </p>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="space-y-3" aria-labelledby="answers">
          <h2 id="answers" className="text-[19px] font-bold">
            Your answers
          </h2>
          <AllAnswers application={a} prompts={BUILDER_ASSESSMENT_PROMPTS} />
        </section>
        <div className="space-y-6">
          <section className="space-y-3" aria-labelledby="history">
            <h2 id="history" className="text-[19px] font-bold">
              History
            </h2>
            <Card className="p-5">
              <Timeline application={a} />
            </Card>
          </section>
          {canWithdraw && (
            <section className="space-y-3" aria-labelledby="withdraw">
              <h2 id="withdraw" className="text-[19px] font-bold">
                Withdraw
              </h2>
              <Card className="space-y-3 p-5">
                <p className="text-[14px] text-muted">Changed your mind? You can withdraw at any point before a decision.</p>
                <WithdrawForm applicationId={a.id} />
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
