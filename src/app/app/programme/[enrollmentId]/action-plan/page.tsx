import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActionPlanForm, ActionPlanReviewForm } from '@/components/outcomes/outcome-forms';
import { OutcomeBack } from '@/components/outcomes/outcome-nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { dateTime, isUuid } from '@/lib/learning';
import { ACTION_PLAN_STATUS_LABELS, ACTION_PLAN_STATUS_TONES, type ActionPlan } from '@/lib/outcomes';

export const metadata: Metadata = { title: '12-month action plan' };

type Props = { params: Promise<{ enrollmentId: string }>; searchParams: Promise<{ cohort?: string }> };

/** The post-Lab 12-month action plan: a graduation requirement the learner writes and faculty approve. */
export default async function ActionPlanPage({ params, searchParams }: Props) {
  const [{ enrollmentId }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(enrollmentId)) notFound();
  const res = await api<ActionPlan>('GET', `/v1/learning/programs/enrollments/${enrollmentId}/action-plan`);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const plan = res.data;
  const cohortId = sp.cohort && isUuid(sp.cohort) ? sp.cohort : null;
  const editable = plan.can.edit && (plan.status === 'draft' || plan.status === 'changes_requested');

  return (
    <div className="space-y-8">
      <OutcomeBack enrollmentId={enrollmentId} cohortId={cohortId} board="graduation" current="action-plan" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">Graduation requirement</Eyebrow>
          <h1 className="text-[30px] font-extrabold">12-month action plan</h1>
          <p className="text-[14px] text-muted">What happens after the Lab: where you will be in a year, the milestones on the way, what you need and what could go wrong.</p>
        </div>
        <Badge tone={ACTION_PLAN_STATUS_TONES[plan.status]}>{ACTION_PLAN_STATUS_LABELS[plan.status]}</Badge>
      </header>

      {plan.review && (
        <Notice tone={plan.review.decision === 'approved' ? 'success' : 'info'}>
          <span className="block font-semibold">
            {plan.review.decision === 'approved' ? 'Approved' : 'Changes asked'} by {plan.review.reviewer}, {dateTime(plan.review.reviewedAt)}
          </span>
          <span className="mt-1 block whitespace-pre-line">{plan.review.feedback}</span>
        </Notice>
      )}

      {editable ? (
        <Card className="p-5 sm:p-6">
          <ActionPlanForm enrollmentId={enrollmentId} plan={plan} />
        </Card>
      ) : (
        <Card className="space-y-5 p-5 sm:p-6">
          {plan.status === 'submitted' && plan.can.edit && <p className="text-[13.5px] text-muted">With faculty for approval{plan.submittedAt ? ` since ${dateTime(plan.submittedAt)}` : ''}.</p>}
          <PlanSection title="In twelve months" text={plan.vision} />
          <section className="space-y-2">
            <h2 className="text-[17px] font-bold">Milestones</h2>
            {plan.milestones.length === 0 ? (
              <p className="text-[14px] text-muted">None yet.</p>
            ) : (
              <ol className="divide-y divide-line rounded-[var(--radius-field)] ring-1 ring-line">
                {[...plan.milestones].sort((a, b) => a.month - b.month).map((m, i) => (
                  <li key={i} className="grid gap-1 px-4 py-3 sm:grid-cols-[6rem_1fr_1fr]">
                    <span className="font-mono text-[13px] text-muted">Month {m.month}</span>
                    <span className="text-[14px] font-semibold text-ink">{m.milestone}</span>
                    <span className="text-[13.5px] text-body">{m.measure}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <PlanSection title="What is needed" text={plan.resources} />
          <PlanSection title="Risks" text={plan.risks} />
        </Card>
      )}

      {plan.can.review && plan.status === 'submitted' && (
        <Card className="space-y-3 p-5">
          <h2 className="text-[17px] font-bold">Review the plan</h2>
          <ActionPlanReviewForm enrollmentId={enrollmentId} />
        </Card>
      )}
    </div>
  );
}

function PlanSection({ title, text }: { title: string; text: string }) {
  return (
    <section className="space-y-1">
      <h2 className="text-[17px] font-bold">{title}</h2>
      {text ? <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-body">{text}</p> : <p className="text-[14px] text-muted">Not written yet.</p>}
    </section>
  );
}
