import type { EnrollmentSummary } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import { EnrollmentCard } from '@/components/learning/enrollment-card';
import Link from 'next/link';
import { Badge, ButtonLink, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { ASSIGNEE_STATUS_LABELS, ASSIGNEE_STATUS_TONES, dueDate, type MyAssignment } from '@/lib/assigned';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';

export const metadata: Metadata = { title: 'My learning' };

export default async function MyLearningPage() {
  const [res, assigned] = await Promise.all([
    api<{ items: EnrollmentSummary[] }>('GET', '/v1/learning/enrollments'),
    api<{ items: MyAssignment[] }>('GET', '/v1/learning/me/assigned'),
  ]);
  // Courses an organisation assigned, not yet finished; finished ones stay with the rest below.
  const toDo = assigned.ok ? assigned.data.items.filter((a) => a.status !== 'completed') : [];
  const items = res.ok ? res.data.items : [];
  const active = items.filter((e) => e.status !== 'completed');
  const done = items.filter((e) => e.status === 'completed');

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">Your courses</Eyebrow>
          <h1 className="text-[30px] font-extrabold">My learning</h1>
          <p className="text-[14.5px] text-muted">Pick up where you left off. Everything you write in reflections is kept in your journal.</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/app/journal" variant="secondary" className="h-10 px-4 text-[14px]">
            My journal
          </ButtonLink>
          <ButtonLink href="/courses" className="h-10 px-4 text-[14px]">
            Explore courses
          </ButtonLink>
        </div>
      </header>

      {toDo.length > 0 && <AssignedToMe items={toDo} />}

      {!res.ok ? (
        <Notice tone="error">{friendlyError(res.error)}</Notice>
      ) : items.length === 0 ? (
        <Card className="space-y-4 p-10 text-center">
          <p className="font-display text-[20px] font-bold text-ink">You haven’t started a course yet.</p>
          <p className="text-[14.5px] text-muted">Courses are free to start and take a few minutes a day. Problem Solving is a good first one.</p>
          <ButtonLink href="/courses" className="mx-auto sm:px-8">
            Browse courses
          </ButtonLink>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3" aria-labelledby="in-progress">
              <h2 id="in-progress" className="text-[19px] font-bold">
                In progress
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {active.map((e) => (
                  <EnrollmentCard key={e.id} e={e} />
                ))}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section className="space-y-3" aria-labelledby="completed">
              <h2 id="completed" className="text-[19px] font-bold">
                Completed
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {done.map((e) => (
                  <EnrollmentCard key={e.id} e={e} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Assigned by an organisation (ASSIGN-1): due dates first, overdue ones marked. */
function AssignedToMe({ items }: { items: MyAssignment[] }) {
  const sorted = [...items].sort((a, b) => (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999'));
  return (
    <section className="space-y-3" aria-labelledby="assigned-to-me">
      <h2 id="assigned-to-me" className="text-[19px] font-bold">
        Assigned to me
      </h2>
      <Card>
        <ul className="divide-y divide-line">
          {sorted.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{a.course.title}</span>
                <span className="block text-[13px] text-muted">
                  {a.orgName}
                  {a.dueOn && (
                    <>
                      {' · '}
                      <span className={a.status === 'overdue' ? 'font-semibold text-danger-ink' : undefined}>Due {dueDate(a.dueOn)}</span>
                    </>
                  )}
                  {` · ${a.progressPct}%`}
                </span>
                {a.note && <span className="mt-0.5 block text-[13px] text-body">{a.note}</span>}
              </span>
              <span className="flex items-center gap-3">
                <Badge tone={ASSIGNEE_STATUS_TONES[a.status]}>{ASSIGNEE_STATUS_LABELS[a.status]}</Badge>
                <Link
                  href={a.enrollmentId ? `/learn/${a.enrollmentId}` : `/courses/${a.course.slug}`}
                  className="min-h-10 content-center text-[14px] font-semibold text-link hover:underline"
                >
                  {a.status === 'not_started' ? 'Start' : 'Continue'}
                  <span className="sr-only"> {a.course.title}</span>
                </Link>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
