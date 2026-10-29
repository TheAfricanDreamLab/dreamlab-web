import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { EditAssignmentForm, WithdrawAssignmentForm } from '@/components/assigned/assigned-forms';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { ASSIGNEE_STATUS_LABELS, ASSIGNEE_STATUS_TONES, ASSIGNEE_STATUSES, dueDate, type LearningAssignmentDetail } from '@/lib/assigned';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { dateTime, isUuid } from '@/lib/learning';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Assigned course' };

type Props = { params: Promise<{ assignmentId: string }>; searchParams: Promise<{ created?: string }> };

export default async function AssignmentPage({ params, searchParams }: Props) {
  const [{ assignmentId }, sp, me] = await Promise.all([params, searchParams, getMe()]);
  if (!isUuid(assignmentId)) notFound();
  const active = activeMembership(me);
  if (!active || !can(me, 'learning.assign')) redirect('/app');

  const res = await api<LearningAssignmentDetail>('GET', `/v1/learning/org/assignments/${assignmentId}`);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const a = res.data;

  return (
    <div className="space-y-8">
      <BackLink href="/app/assignments" label="Assigned learning" />
      <header className="space-y-1">
        <Eyebrow tone="gold">{active.org.name}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">{a.course.title}</h1>
        <p className="text-[14px] text-muted">
          {a.dueOn ? `Due ${dueDate(a.dueOn)}` : 'No due date'} · assigned by {a.assignedBy} on {dateTime(a.createdAt)}
        </p>
        {a.note && <p className="whitespace-pre-line pt-1 text-[14.5px] text-body">{a.note}</p>}
      </header>
      {sp.created && <Notice tone="success">Assigned. Everyone below is enrolled and has been told.</Notice>}

      <div className="flex flex-wrap gap-1.5" aria-label="Progress">
        {ASSIGNEE_STATUSES.map((s) => (
          <Badge key={s} tone={ASSIGNEE_STATUS_TONES[s]}>
            {`${a.counts[s] ?? 0} ${ASSIGNEE_STATUS_LABELS[s].toLowerCase()}`}
          </Badge>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="space-y-3" aria-labelledby="people">
          <h2 id="people" className="text-[19px] font-bold">
            People
          </h2>
          {a.assignees.length === 0 ? (
            <Card className="p-6 text-[14.5px] text-muted">Nobody on this assignment. The groups chosen had no active members.</Card>
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {a.assignees.map((p) => (
                  <li key={p.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{p.name}</span>
                      <span className="block text-[13px] text-muted">
                        {p.completedAt ? `Completed ${dateTime(p.completedAt)}` : `${p.progressPct}% through`}
                      </span>
                    </span>
                    <Badge tone={ASSIGNEE_STATUS_TONES[p.status]}>{ASSIGNEE_STATUS_LABELS[p.status]}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <div className="space-y-6">
          <section className="space-y-3" aria-labelledby="change">
            <h2 id="change" className="text-[19px] font-bold">
              Due date and note
            </h2>
            <Card className="p-5">
              <EditAssignmentForm assignmentId={a.id} dueOn={a.dueOn} note={a.note} />
            </Card>
          </section>
          <section className="space-y-3" aria-labelledby="withdraw">
            <h2 id="withdraw" className="text-[19px] font-bold">
              Withdraw
            </h2>
            <Card className="space-y-3 p-5">
              <p className="text-[14px] text-muted">Withdrawing removes the course from everyone’s assigned list. Their enrolments and progress stay.</p>
              <WithdrawAssignmentForm assignmentId={a.id} title={a.course.title} />
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
