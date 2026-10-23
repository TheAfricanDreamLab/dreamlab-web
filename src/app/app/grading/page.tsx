import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { GRADING_STATUS_LABELS, GRADING_STATUS_TONES, type GradingQueueItem } from '@/lib/grading';
import { dateTime } from '@/lib/learning';
import { activeMembership, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Grading' };

const TABS = [
  { status: 'awaiting', label: 'To grade' },
  { status: 'draft', label: 'Drafts' },
  { status: 'released', label: 'Released' },
  { status: 'all', label: 'All' },
] as const;

type Props = { searchParams: Promise<{ status?: string }> };

/** The grading queue: assignment submissions to grade where the grader teaches (the API decides who sees what). */
export default async function GradingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = TABS.find((t) => t.status === sp.status)?.status ?? 'awaiting';
  const [me, res] = await Promise.all([getMe(), api<{ items: GradingQueueItem[] }>('GET', `/v1/learning/grading/queue?status=${status}`)]);
  const active = activeMembership(me);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Eyebrow tone="gold">{active ? active.org.name : 'Personal learning'}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Grading</h1>
        <p className="text-[14.5px] text-muted">Assignments learners have submitted. Score each against its rubric, write feedback, then release the grade.</p>
      </header>

      <nav aria-label="Grading queue" className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/app/grading?status=${t.status}`}
            aria-current={t.status === status ? 'page' : undefined}
            className={cx(
              'flex min-h-10 items-center rounded-full px-4 text-[14px] font-semibold ring-1',
              t.status === status ? 'bg-forest text-white ring-forest' : 'text-body ring-line hover:bg-surface',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {!res.ok ? (
        <Notice tone="error">{res.status === 403 ? 'You don’t grade in this organisation. Switch to the organisation you teach in.' : friendlyError(res.error)}</Notice>
      ) : res.data.items.length === 0 ? (
        <Card className="p-8 text-center text-[14.5px] text-muted">{status === 'awaiting' ? 'Nothing waiting. Every submission has a grade.' : 'Nothing here yet.'}</Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {res.data.items.map((s) => (
              <li key={s.submissionId}>
                <Link href={`/app/grading/${s.submissionId}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">
                      {s.learner.name} · {s.item.title}
                    </span>
                    <span className="block text-[13px] text-muted">
                      {s.course.title}
                      {s.cohortName && ` · ${s.cohortName}`} · version {s.version} · {dateTime(s.submittedAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {s.scorePct !== null && <span className="font-mono text-[13px] text-muted">{s.scorePct}%</span>}
                    <Badge tone={GRADING_STATUS_TONES[s.status]}>{GRADING_STATUS_LABELS[s.status]}</Badge>
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
